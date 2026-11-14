/**
 * `command` directive handlers for programmatic GraphQL RPC.
 *
 * @module graphql/commands
 */

import { GraphQLError } from "graphql";
import type { SessionMode } from "../sdk/queue/types";
import type { QueueStatus } from "../repository/queue-repository";
import {
  asRecord,
  isActivityStatus,
  isGroupStatus,
  isQueueStatus,
  readGroupSession,
  readNumber,
  readOptionalBoolean,
  readOptionalNumber,
  readOptionalSessionMode,
  readOptionalString,
  readOptionalStringArray,
  readString,
} from "./coercion";
import { requirePermission } from "./authz";
import { notFoundError } from "./graphql-errors";
import { resolveSessionMessages } from "./session-fields";
import type { GraphqlContext, RecordLike } from "./types";

export async function executeCommand(
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
  const listFilter =
    status !== undefined && isGroupStatus(status) ? { status } : undefined;
  const groups = await context.sdk.groups.listGroups(listFilter);
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
    status !== undefined && isActivityStatus(status) ? { status } : undefined,
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
