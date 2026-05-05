import {
  GraphQLError,
  GraphQLBoolean,
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  Kind,
  execute,
  parse,
  validate,
  type ExecutionResult,
  type ValueNode,
} from "graphql";
import type { SdkManager } from "../sdk";
import type { TokenManager, ApiToken, Permission } from "../auth";
import type { TranscriptEvent } from "../polling/parser";
import type { GroupSession, GroupStatus } from "../sdk/group/types";
import type { SessionMode } from "../sdk/queue/types";
import type { ActivityStatus } from "../types/activity";
import type { QueueStatus } from "../repository/queue-repository";
import type { Message, ToolCall, ToolResult } from "../types/message";
import type { Session, SessionMetadata, TokenUsage } from "../types/session";
import type {
  SearchSessionsOptions,
  SessionSearchResponse,
  TranscriptSearchOptions,
  TranscriptSearchResult,
} from "../types/session-index";

interface RecordLike {
  readonly [key: string]: unknown;
}

export interface GraphqlContext {
  readonly sdk: SdkManager;
  readonly tokenManager?: Pick<TokenManager, "hasPermission"> | undefined;
  readonly token?: ApiToken | undefined;
}

export interface GraphqlExecutionRequest {
  readonly document: string;
  readonly variables?: Readonly<Record<string, unknown>> | undefined;
  readonly context: GraphqlContext;
}

interface SessionConnectionSource {
  readonly nodes: readonly SessionMetadata[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

interface SessionHistorySource {
  readonly sessionId: string;
  readonly events: readonly TranscriptEvent[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly tokenUsage?: TokenUsage | undefined;
}

type SessionGraphqlSource = Session | SessionMetadata;
type GraphqlMessage = Omit<Message, "content"> & { readonly content: unknown };

const JSON_SCALAR = new GraphQLScalarType({
  name: "JSON",
  serialize(value: unknown): unknown {
    return value;
  },
  parseValue(value: unknown): unknown {
    return value;
  },
  parseLiteral(ast: ValueNode): unknown {
    return parseJsonLiteral(ast);
  },
});

const TRANSCRIPT_SEARCH_ROLE_ENUM = new GraphQLEnumType({
  name: "TranscriptSearchRole",
  values: {
    USER: { value: "user" },
    ASSISTANT: { value: "assistant" },
    BOTH: { value: "both" },
  },
});

const SESSION_SEARCH_SOURCE_ENUM = new GraphQLEnumType({
  name: "SessionSearchSource",
  values: {
    ALL: { value: "all" },
    UUID: { value: "uuid" },
    LEGACY: { value: "legacy" },
  },
});

const TOKEN_USAGE_TYPE = new GraphQLObjectType<{
  readonly tokenUsage?: TokenUsage | undefined;
}>({
  name: "TokenUsage",
  fields: {
    input: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve(source) {
        return source.tokenUsage?.input ?? 0;
      },
    },
    output: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve(source) {
        return source.tokenUsage?.output ?? 0;
      },
    },
    cacheRead: {
      type: GraphQLInt,
      resolve(source) {
        return source.tokenUsage?.cacheRead;
      },
    },
    cacheWrite: {
      type: GraphQLInt,
      resolve(source) {
        return source.tokenUsage?.cacheWrite;
      },
    },
  },
});

const TOOL_CALL_TYPE = new GraphQLObjectType<ToolCall>({
  name: "SessionToolCall",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    input: { type: new GraphQLNonNull(JSON_SCALAR) },
  },
});

const TOOL_RESULT_TYPE = new GraphQLObjectType<ToolResult>({
  name: "SessionToolResult",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    output: { type: new GraphQLNonNull(GraphQLString) },
    isError: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
});

const MESSAGE_TYPE = new GraphQLObjectType<GraphqlMessage>({
  name: "SessionMessage",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    role: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(JSON_SCALAR) },
    timestamp: { type: new GraphQLNonNull(GraphQLString) },
    toolCalls: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(TOOL_CALL_TYPE)),
      ),
      resolve(source) {
        return source.toolCalls ?? [];
      },
    },
    toolResults: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(TOOL_RESULT_TYPE)),
      ),
      resolve(source) {
        return source.toolResults ?? [];
      },
    },
    hasToolUseBlocks: { type: GraphQLBoolean },
    hasToolResultBlocks: { type: GraphQLBoolean },
  },
});

const TRANSCRIPT_EVENT_TYPE = new GraphQLObjectType<TranscriptEvent>({
  name: "TranscriptEvent",
  fields: {
    type: { type: new GraphQLNonNull(GraphQLString) },
    uuid: { type: GraphQLString },
    timestamp: { type: GraphQLString },
    content: { type: JSON_SCALAR },
    raw: { type: new GraphQLNonNull(JSON_SCALAR) },
  },
});

const SESSION_HISTORY_TYPE = new GraphQLObjectType<SessionHistorySource>({
  name: "SessionHistory",
  fields: {
    sessionId: { type: new GraphQLNonNull(GraphQLString) },
    events: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(TRANSCRIPT_EVENT_TYPE)),
      ),
    },
    total: { type: new GraphQLNonNull(GraphQLInt) },
    offset: { type: new GraphQLNonNull(GraphQLInt) },
    limit: { type: new GraphQLNonNull(GraphQLInt) },
    tokenUsage: {
      type: TOKEN_USAGE_TYPE,
      resolve(source) {
        return source.tokenUsage === undefined ? null : source;
      },
    },
  },
});

const TRANSCRIPT_SEARCH_RESULT_TYPE =
  new GraphQLObjectType<TranscriptSearchResult>({
    name: "TranscriptSearchResult",
    fields: {
      sessionId: { type: new GraphQLNonNull(GraphQLString) },
      matched: { type: new GraphQLNonNull(GraphQLBoolean) },
      matchCount: { type: new GraphQLNonNull(GraphQLInt) },
      scannedBytes: { type: new GraphQLNonNull(GraphQLInt) },
      scannedLines: { type: new GraphQLNonNull(GraphQLInt) },
      truncated: { type: new GraphQLNonNull(GraphQLBoolean) },
      timedOut: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
  });

const SESSION_SEARCH_RESULT_TYPE = new GraphQLObjectType<SessionSearchResponse>(
  {
    name: "SessionSearchResult",
    fields: {
      sessionIds: {
        type: new GraphQLNonNull(
          new GraphQLList(new GraphQLNonNull(GraphQLString)),
        ),
      },
      total: { type: new GraphQLNonNull(GraphQLInt) },
      offset: { type: new GraphQLNonNull(GraphQLInt) },
      limit: { type: new GraphQLNonNull(GraphQLInt) },
      scannedSessions: { type: new GraphQLNonNull(GraphQLInt) },
      truncated: { type: new GraphQLNonNull(GraphQLBoolean) },
      timedOut: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
  },
);

const SESSION_TYPE = new GraphQLObjectType<
  SessionGraphqlSource,
  GraphqlContext
>({
  name: "Session",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    projectPath: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(GraphQLString) },
    messageCount: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve(source) {
        return isFullSession(source)
          ? source.messages.length
          : source.messageCount;
      },
    },
    costUsd: { type: GraphQLFloat },
    tokenUsage: {
      type: TOKEN_USAGE_TYPE,
      resolve(source) {
        return source.tokenUsage === undefined ? null : source;
      },
    },
    messages: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(MESSAGE_TYPE)),
      ),
      args: {
        parseMarkdown: { type: GraphQLBoolean },
        excludeToolMessages: { type: GraphQLBoolean },
      },
      async resolve(source, args, context) {
        requirePermission(context, "session:read");
        return resolveSessionMessages(readSessionId(source), context, {
          parseMarkdown: args.parseMarkdown ?? false,
          excludeToolMessages: args.excludeToolMessages ?? false,
        });
      },
    },
    history: {
      type: new GraphQLNonNull(SESSION_HISTORY_TYPE),
      args: {
        offset: { type: GraphQLInt },
        limit: { type: GraphQLInt },
      },
      async resolve(source, args, context) {
        requirePermission(context, "session:read");
        return resolveSessionHistory(readSessionId(source), context, {
          offset: args.offset,
          limit: args.limit,
        });
      },
    },
    grep: {
      type: new GraphQLNonNull(TRANSCRIPT_SEARCH_RESULT_TYPE),
      args: {
        query: { type: new GraphQLNonNull(GraphQLString) },
        caseSensitive: { type: GraphQLBoolean },
        role: { type: TRANSCRIPT_SEARCH_ROLE_ENUM },
        maxMatches: { type: GraphQLInt },
        maxBytes: { type: GraphQLInt },
        timeoutMs: { type: GraphQLInt },
      },
      async resolve(source, args, context) {
        requirePermission(context, "session:read");
        return resolveSessionGrep(readSessionId(source), args.query, context, {
          caseSensitive: args.caseSensitive,
          role: args.role,
          maxMatches: args.maxMatches,
          maxBytes: args.maxBytes,
          timeoutMs: args.timeoutMs,
        });
      },
    },
  },
});

const SESSION_CONNECTION_TYPE = new GraphQLObjectType<SessionConnectionSource>({
  name: "SessionConnection",
  fields: {
    nodes: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(SESSION_TYPE)),
      ),
    },
    total: { type: new GraphQLNonNull(GraphQLInt) },
    offset: { type: new GraphQLNonNull(GraphQLInt) },
    limit: { type: new GraphQLNonNull(GraphQLInt) },
  },
});

const QUERY_TYPE = new GraphQLObjectType<unknown, GraphqlContext>({
  name: "Query",
  fields: {
    command: {
      type: new GraphQLNonNull(JSON_SCALAR),
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        params: { type: JSON_SCALAR },
      },
      async resolve(_source, args, context) {
        return executeCommand(args.name, args.params, context);
      },
    },
    ping: {
      type: new GraphQLNonNull(GraphQLBoolean),
      resolve() {
        return true;
      },
    },
    sessions: {
      type: new GraphQLNonNull(SESSION_CONNECTION_TYPE),
      args: {
        projectPath: { type: GraphQLString },
        status: { type: GraphQLString },
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt },
      },
      async resolve(_source, args, context) {
        requirePermission(context, "session:read");

        let sessions = [
          ...(await context.sdk.sessions.listSessions(args.projectPath)),
        ];
        if (typeof args.status === "string" && args.status.length > 0) {
          sessions = sessions.filter(
            (session) => session.status === args.status,
          );
        }

        const offset = Math.max(0, args.offset ?? 0);
        const total = sessions.length;
        const paginated =
          args.limit === undefined
            ? sessions.slice(offset)
            : sessions.slice(offset, offset + Math.max(0, args.limit));

        return {
          nodes: paginated,
          total,
          offset,
          limit:
            args.limit === undefined
              ? paginated.length
              : Math.max(0, args.limit),
        };
      },
    },
    session: {
      type: SESSION_TYPE,
      args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      async resolve(_source, args, context) {
        requirePermission(context, "session:read");
        return context.sdk.sessions.getSession(args.id);
      },
    },
    searchSessions: {
      type: new GraphQLNonNull(SESSION_SEARCH_RESULT_TYPE),
      args: {
        query: { type: new GraphQLNonNull(GraphQLString) },
        projectPath: { type: GraphQLString },
        workingDirectoryPrefix: { type: GraphQLString },
        projectPathPrefix: { type: GraphQLString },
        source: { type: SESSION_SEARCH_SOURCE_ENUM },
        offset: { type: GraphQLInt },
        limit: { type: GraphQLInt },
        maxSessions: { type: GraphQLInt },
        caseSensitive: { type: GraphQLBoolean },
        role: { type: TRANSCRIPT_SEARCH_ROLE_ENUM },
        maxMatches: { type: GraphQLInt },
        maxBytes: { type: GraphQLInt },
        timeoutMs: { type: GraphQLInt },
      },
      async resolve(_source, args, context) {
        requirePermission(context, "session:read");
        return resolveSessionSearch(args.query, context, {
          projectPath: args.projectPath,
          workingDirectoryPrefix: args.workingDirectoryPrefix,
          projectPathPrefix: args.projectPathPrefix,
          source: args.source,
          offset: args.offset,
          limit: args.limit,
          maxSessions: args.maxSessions,
          caseSensitive: args.caseSensitive,
          role: args.role,
          maxMatches: args.maxMatches,
          maxBytes: args.maxBytes,
          timeoutMs: args.timeoutMs,
        });
      },
    },
  },
});

const MUTATION_TYPE = new GraphQLObjectType<unknown, GraphqlContext>({
  name: "Mutation",
  fields: {
    command: {
      type: new GraphQLNonNull(JSON_SCALAR),
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        params: { type: JSON_SCALAR },
      },
      async resolve(_source, args, context) {
        return executeCommand(args.name, args.params, context);
      },
    },
  },
});

const SCHEMA = new GraphQLSchema({
  query: QUERY_TYPE,
  mutation: MUTATION_TYPE,
});

export function getGraphqlSchema(): GraphQLSchema {
  return SCHEMA;
}

export async function executeGraphqlDocument(
  request: GraphqlExecutionRequest,
): Promise<ExecutionResult> {
  let document;
  try {
    document = parse(request.document);
  } catch (error) {
    return toErrorResult(asGraphqlError(error));
  }

  const validationErrors = validate(SCHEMA, document);
  if (validationErrors.length > 0) {
    return { errors: validationErrors };
  }

  return execute({
    schema: SCHEMA,
    document,
    variableValues: request.variables,
    contextValue: request.context,
  });
}

async function executeCommand(
  commandName: string,
  params: unknown,
  context: GraphqlContext,
): Promise<unknown> {
  const record = asRecord(params);

  switch (commandName) {
    case "session.list":
      return executeSessionList(record, context);
    case "session.get":
      return executeSessionGet(record, context);
    case "session.messages":
      return executeSessionMessages(record, context);
    case "session.create":
    case "session.cancel":
    case "session.pause":
    case "session.resume":
      requirePermission(context, "session:create");
      throw new GraphQLError(
        `${commandName} is not implemented in this runtime`,
      );
    case "group.create":
      return executeGroupCreate(record, context);
    case "group.list":
      return executeGroupList(record, context);
    case "group.get":
      return executeGroupGet(record, context);
    case "group.run":
      return executeGroupRun(record, context);
    case "group.pause":
      return executeGroupPause(record, context);
    case "group.resume":
      return executeGroupResume(record, context);
    case "group.delete":
      return executeGroupDelete(record, context);
    case "group.addSession":
      return executeGroupAddSession(record, context);
    case "group.removeSession":
      return executeGroupRemoveSession(record, context);
    case "queue.create":
      return executeQueueCreate(record, context);
    case "queue.list":
      return executeQueueList(record, context);
    case "queue.get":
      return executeQueueGet(record, context);
    case "queue.addCommand":
      return executeQueueAddCommand(record, context);
    case "queue.updateCommand":
      return executeQueueUpdateCommand(record, context);
    case "queue.removeCommand":
      return executeQueueRemoveCommand(record, context);
    case "queue.run":
      return executeQueueRun(record, context);
    case "queue.pause":
      return executeQueuePause(record, context);
    case "queue.resume":
      return executeQueueResume(record, context);
    case "queue.delete":
      return executeQueueDelete(record, context);
    case "bookmark.add":
      return executeBookmarkAdd(record, context);
    case "bookmark.list":
      return executeBookmarkList(record, context);
    case "bookmark.search":
      return executeBookmarkSearch(record, context);
    case "bookmark.get":
      return executeBookmarkGet(record, context);
    case "bookmark.content":
      return executeBookmarkContent(record, context);
    case "bookmark.delete":
      return executeBookmarkDelete(record, context);
    case "activity.list":
      return executeActivityList(record, context);
    case "activity.get":
      return executeActivityGet(record, context);
    default:
      throw new GraphQLError(`Unknown GraphQL command: ${commandName}`);
  }
}

async function executeSessionList(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "session:read");

  const projectPath = readOptionalString(params, "projectPath");
  const status = readOptionalString(params, "status");
  const limit = readOptionalNumber(params, "limit");
  const offset = readOptionalNumber(params, "offset") ?? 0;

  let sessions = [...(await context.sdk.sessions.listSessions(projectPath))];
  if (status !== undefined) {
    sessions = sessions.filter((session) => session.status === status);
  }

  const start = Math.max(0, offset);
  const end = limit === undefined ? undefined : start + Math.max(0, limit);
  return sessions.slice(start, end);
}

async function executeSessionGet(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "session:read");

  const session = await context.sdk.sessions.getSession(
    readString(params, "id"),
  );
  if (session === null) {
    throw notFoundError("Session");
  }
  return session;
}

async function executeSessionMessages(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "session:read");

  return resolveSessionMessages(readString(params, "id"), context, {
    parseMarkdown: readOptionalBoolean(params, "parseMarkdown") ?? false,
    excludeToolMessages:
      readOptionalBoolean(params, "excludeToolMessages") ?? false,
  });
}

function isFullSession(source: SessionGraphqlSource): source is Session {
  return "messages" in source;
}

function readSessionId(source: SessionGraphqlSource): string {
  return source.id;
}

async function resolveSessionMessages(
  sessionId: string,
  context: GraphqlContext,
  options: {
    readonly parseMarkdown: boolean;
    readonly excludeToolMessages: boolean;
  },
): Promise<readonly GraphqlMessage[]> {
  const messages = await context.sdk.sessions.getMessages(sessionId, {
    excludeToolMessages: options.excludeToolMessages,
  });

  if (messages.length === 0) {
    const session = await context.sdk.sessions.getSession(sessionId);
    if (session === null) {
      throw notFoundError("Session");
    }
  }

  if (!options.parseMarkdown) {
    return messages;
  }

  return messages.map((message) => ({
    ...message,
    content: context.sdk.parseMarkdown(message.content),
  }));
}

async function resolveSessionHistory(
  sessionId: string,
  context: GraphqlContext,
  options: { readonly offset?: number; readonly limit?: number },
): Promise<SessionHistorySource> {
  const result = await context.sdk.sessions.readTranscript(sessionId, options);
  if (result.isErr()) {
    throw asGraphqlError(result.error);
  }

  return {
    sessionId,
    events: result.value.events,
    total: result.value.total,
    offset: Math.max(0, options.offset ?? 0),
    limit: options.limit ?? result.value.events.length,
    tokenUsage: result.value.tokenUsage,
  };
}

async function resolveSessionGrep(
  sessionId: string,
  query: string,
  context: GraphqlContext,
  options: TranscriptSearchOptions,
): Promise<TranscriptSearchResult> {
  const result = await context.sdk.sessions.searchTranscript(
    sessionId,
    query,
    options,
  );
  if (result.isErr()) {
    throw asGraphqlError(result.error);
  }
  return result.value;
}

async function resolveSessionSearch(
  query: string,
  context: GraphqlContext,
  options: SearchSessionsOptions,
) {
  return context.sdk.sessions.searchSessions(query, options);
}

async function executeGroupCreate(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "group:create");

  return context.sdk.groups.createGroup({
    name: readString(params, "name"),
    description: readOptionalString(params, "description"),
  });
}

async function executeGroupList(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "session:read");

  const status = readOptionalString(params, "status");
  const limit = readOptionalNumber(params, "limit");
  const groups = await context.sdk.groups.listGroups(
    status === undefined ? undefined : { status: status as GroupStatus },
  );
  return limit === undefined ? groups : groups.slice(0, Math.max(0, limit));
}

async function executeGroupGet(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "session:read");

  const group = await context.sdk.groups.getGroup(readString(params, "id"));
  if (group === null) {
    throw notFoundError("Group");
  }
  return group;
}

async function executeGroupRun(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "group:run");

  const group = await context.sdk.groups.getGroup(readString(params, "id"));
  if (group === null) {
    throw notFoundError("Group");
  }

  await context.sdk.groupRunner.run(group, {
    maxConcurrent: readOptionalNumber(params, "concurrent") ?? 1,
    respectDependencies:
      readOptionalBoolean(params, "respectDependencies") ?? true,
  });
  return { success: true };
}

async function executeGroupPause(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "group:run");

  const groupId = readString(params, "id");
  const group = await context.sdk.groups.getGroup(groupId);
  if (group === null) {
    throw notFoundError("Group");
  }

  await context.sdk.groupRunner.pause();
  return { success: true, id: groupId };
}

async function executeGroupResume(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "group:run");

  const groupId = readString(params, "id");
  const group = await context.sdk.groups.getGroup(groupId);
  if (group === null) {
    throw notFoundError("Group");
  }

  await context.sdk.groupRunner.resume();
  return { success: true, id: groupId };
}

async function executeGroupDelete(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "group:create");

  const groupId = readString(params, "id");
  await context.sdk.groups.deleteGroup(groupId);
  return { success: true, id: groupId };
}

async function executeGroupAddSession(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "group:create");

  const session = readGroupSession(params, "session");
  return context.sdk.groups.addSession(readString(params, "id"), session);
}

async function executeGroupRemoveSession(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "group:create");

  return context.sdk.groups.removeSession(
    readString(params, "id"),
    readString(params, "sessionId"),
  );
}

async function executeQueueCreate(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "queue:*");

  return context.sdk.queues.createQueue({
    projectPath: readString(params, "projectPath"),
    name: readOptionalString(params, "name"),
  });
}

async function executeQueueList(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "queue:*");

  const filter: { projectPath?: string; status?: QueueStatus } = {};
  const projectPath = readOptionalString(params, "projectPath");
  const status = readOptionalString(params, "status");
  if (projectPath !== undefined) {
    filter.projectPath = projectPath;
  }
  if (isQueueStatus(status)) {
    filter.status = status;
  }

  return context.sdk.queues.listQueues({
    filter: Object.keys(filter).length === 0 ? undefined : filter,
  });
}

async function executeQueueGet(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "queue:*");

  const queue = await context.sdk.queues.getQueue(readString(params, "id"));
  if (queue === null) {
    throw notFoundError("Queue");
  }
  return queue;
}

async function executeQueueAddCommand(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "queue:*");

  return context.sdk.queues.addCommand(readString(params, "id"), {
    prompt: readString(params, "prompt"),
    position: readOptionalNumber(params, "position"),
    sessionMode: readOptionalSessionMode(params, "sessionMode"),
  });
}

async function executeQueueUpdateCommand(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "queue:*");

  const updates: { prompt?: string; sessionMode?: SessionMode } = {};
  const prompt = readOptionalString(params, "prompt");
  const sessionMode = readOptionalSessionMode(params, "sessionMode");
  if (prompt !== undefined) {
    updates.prompt = prompt;
  }
  if (sessionMode !== undefined) {
    updates.sessionMode = sessionMode;
  }

  if (Object.keys(updates).length === 0) {
    throw new GraphQLError(
      "queue.updateCommand requires prompt and/or sessionMode",
    );
  }

  return context.sdk.queues.updateCommand(
    readString(params, "id"),
    readNumber(params, "index"),
    updates,
  );
}

async function executeQueueRemoveCommand(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "queue:*");

  await context.sdk.queues.removeCommand(
    readString(params, "id"),
    readNumber(params, "index"),
  );
  return { success: true };
}

async function executeQueueRun(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "queue:*");

  return context.sdk.queueRunner.run(readString(params, "id"));
}

async function executeQueuePause(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "queue:*");

  await context.sdk.queueRunner.pause(readString(params, "id"));
  return { success: true };
}

async function executeQueueResume(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "queue:*");

  return context.sdk.queueRunner.resume(readString(params, "id"));
}

async function executeQueueDelete(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "queue:*");

  const deleted = await context.sdk.queues.deleteQueue(
    readString(params, "id"),
    readOptionalBoolean(params, "force") ?? false,
  );
  return { deleted };
}

async function executeBookmarkAdd(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "bookmark:*");

  return context.sdk.bookmarks.add({
    type:
      readOptionalString(params, "messageId") === undefined
        ? "session"
        : "message",
    sessionId: readString(params, "sessionId"),
    messageId: readOptionalString(params, "messageId"),
    name: readString(params, "name"),
    tags: readOptionalStringArray(params, "tags"),
  });
}

async function executeBookmarkList(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "bookmark:*");

  const filter: { sessionId?: string; tag?: string } = {};
  const sessionId = readOptionalString(params, "sessionId");
  const tag = readOptionalString(params, "tag");
  if (sessionId !== undefined) {
    filter.sessionId = sessionId;
  }
  if (tag !== undefined) {
    filter.tag = tag;
  }

  return context.sdk.bookmarks.list(
    Object.keys(filter).length === 0 ? undefined : filter,
  );
}

async function executeBookmarkSearch(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "bookmark:*");

  return context.sdk.bookmarks.search(readString(params, "q"), {
    metadataOnly: readOptionalBoolean(params, "metadataOnly") ?? false,
  });
}

async function executeBookmarkGet(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "bookmark:*");

  const bookmark = await context.sdk.bookmarks.get(readString(params, "id"));
  if (bookmark === null) {
    throw notFoundError("Bookmark");
  }
  return bookmark;
}

async function executeBookmarkContent(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "bookmark:*");

  const result = await context.sdk.bookmarks.getWithContent(
    readString(params, "id"),
  );
  if (result === null) {
    throw notFoundError("Bookmark");
  }
  return result;
}

async function executeBookmarkDelete(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "bookmark:*");

  const deleted = await context.sdk.bookmarks.delete(readString(params, "id"));
  return { deleted };
}

async function executeActivityList(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "session:read");

  const status = readOptionalString(params, "status");
  const entries = await context.sdk.activity.list(
    status === undefined ? undefined : { status: status as ActivityStatus },
  );
  return { entries };
}

async function executeActivityGet(
  params: RecordLike,
  context: GraphqlContext,
): Promise<unknown> {
  requirePermission(context, "session:read");

  const entry = await context.sdk.activity.getStatus(
    readString(params, "sessionId"),
  );
  if (entry === null) {
    throw notFoundError("Activity entry");
  }
  return entry;
}

function requirePermission(
  context: GraphqlContext,
  permission: Permission,
): void {
  if (context.tokenManager === undefined || context.token === undefined) {
    return;
  }

  if (!context.tokenManager.hasPermission(context.token, permission)) {
    throw new GraphQLError(`Missing permission: ${permission}`);
  }
}

function readGroupSession(params: RecordLike, key: string): GroupSession {
  const record = readRecord(params, key);
  return {
    id: readString(record, "id"),
    projectPath: readString(record, "projectPath"),
    prompt: readString(record, "prompt"),
    status: readString(record, "status") as GroupSession["status"],
    dependsOn: readOptionalStringArray(record, "dependsOn") ?? [],
    createdAt: readString(record, "createdAt"),
    startedAt: readOptionalString(record, "startedAt"),
    completedAt: readOptionalString(record, "completedAt"),
    cost: readOptionalNumber(record, "cost"),
  };
}

function readString(record: RecordLike, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new GraphQLError(`Expected non-empty string for "${key}"`);
  }
  return value;
}

function readOptionalString(
  record: RecordLike,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(record: RecordLike, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new GraphQLError(`Expected number for "${key}"`);
  }
  return value;
}

function readOptionalNumber(
  record: RecordLike,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readOptionalBoolean(
  record: RecordLike,
  key: string,
): boolean | undefined {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function readOptionalStringArray(
  record: RecordLike,
  key: string,
): readonly string[] | undefined {
  const value = record[key];
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter(
    (entry): entry is string => typeof entry === "string",
  );
  return strings.length === value.length ? strings : undefined;
}

function readOptionalSessionMode(
  record: RecordLike,
  key: string,
): SessionMode | undefined {
  const value = readOptionalString(record, key);
  if (value === "continue" || value === "new") {
    return value;
  }
  return undefined;
}

function readRecord(record: RecordLike, key: string): RecordLike {
  const value = record[key];
  return asRecord(value);
}

function asRecord(value: unknown): RecordLike {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as RecordLike;
}

function isQueueStatus(value: string | undefined): value is QueueStatus {
  return (
    value === "pending" ||
    value === "running" ||
    value === "paused" ||
    value === "stopped" ||
    value === "completed" ||
    value === "failed"
  );
}

function notFoundError(label: string): GraphQLError {
  return new GraphQLError(`${label} not found`);
}

function toErrorResult(error: GraphQLError): ExecutionResult {
  return { errors: [error] };
}

function asGraphqlError(error: unknown): GraphQLError {
  return error instanceof GraphQLError
    ? error
    : new GraphQLError(error instanceof Error ? error.message : String(error));
}

function parseJsonLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.NULL:
      return null;
    case Kind.STRING:
    case Kind.ENUM:
      return ast.value;
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.LIST:
      return ast.values.map(parseJsonLiteral);
    case Kind.OBJECT: {
      const value: Record<string, unknown> = {};
      for (const field of ast.fields) {
        value[field.name.value] = parseJsonLiteral(field.value);
      }
      return value;
    }
    default:
      return null;
  }
}
