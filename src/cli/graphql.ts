import { executeGraphqlDocument, type GraphqlContext } from "../graphql";

interface GraphqlCliArgs {
  readonly document: string;
  readonly variables?: Readonly<Record<string, unknown>> | undefined;
}

export async function runGraphqlCli(
  args: readonly string[],
  context: GraphqlContext,
): Promise<void> {
  const parsed = await parseGraphqlCliArgs(args);
  const result = await executeGraphqlDocument({
    document: parsed.document,
    variables: parsed.variables,
    context,
  });

  console.log(JSON.stringify(result, null, 2));
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    process.exitCode = 1;
  }
}

export async function parseGraphqlCliArgs(
  args: readonly string[],
): Promise<GraphqlCliArgs> {
  const documentArg = args[0];
  if (documentArg === undefined || documentArg.trim().length === 0) {
    throw new Error(
      "Usage: claude-code-agent gql <query|command> [--param <json>] [--variables <json>]",
    );
  }

  const variables = readVariables(args);
  return {
    document: normalizeGraphqlDocument(documentArg),
    ...(variables === undefined ? {} : { variables }),
  };
}

export function normalizeGraphqlDocument(input: string): string {
  const trimmed = input.trim();
  if (
    trimmed.startsWith("query") ||
    trimmed.startsWith("mutation") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  const operation = MUTATION_COMMANDS.has(trimmed) ? "mutation" : "query";
  return `${operation} ($param: JSON) { command(name: ${JSON.stringify(trimmed)}, params: $param) }`;
}

function readVariables(
  args: readonly string[],
): Readonly<Record<string, unknown>> | undefined {
  const variablesRaw = getArgValue(args, "--variables");
  const paramRaw = getArgValue(args, "--param") ?? getArgValue(args, "--arg");

  let variables: Readonly<Record<string, unknown>> | undefined;
  if (variablesRaw !== undefined) {
    variables = parseJsonObject(variablesRaw, "--variables");
  }

  if (paramRaw === undefined) {
    return variables;
  }

  return {
    ...(variables ?? {}),
    param: parseJsonValue(paramRaw, "--param"),
  };
}

function parseJsonObject(
  raw: string,
  label: string,
): Readonly<Record<string, unknown>> {
  const value = parseJsonValue(raw, label);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function parseJsonValue(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON for ${label}: ${message}`);
  }
}

function getArgValue(
  args: readonly string[],
  flag: string,
): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index + 1 >= args.length) {
    return undefined;
  }
  return args[index + 1];
}

const MUTATION_COMMANDS = new Set<string>([
  "session.create",
  "session.cancel",
  "session.pause",
  "session.resume",
  "group.create",
  "group.run",
  "group.pause",
  "group.resume",
  "group.delete",
  "group.addSession",
  "group.removeSession",
  "queue.create",
  "queue.addCommand",
  "queue.updateCommand",
  "queue.removeCommand",
  "queue.run",
  "queue.pause",
  "queue.resume",
  "queue.delete",
  "bookmark.add",
  "bookmark.delete",
]);
