/**
 * Coerce arbitrary GraphQL `command` payloads into typed values.
 *
 * @module graphql/coercion
 */

import { GraphQLError } from "graphql";
import type { GroupSession, GroupStatus } from "../sdk/group/types";
import type { SessionMode } from "../sdk/queue/types";
import type { QueueStatus } from "../repository/queue-repository";
import type { ActivityStatus } from "../types/activity";
import type { SessionStatus } from "../types/session";
import type { RecordLike } from "./types";

export function readGroupSession(
  params: RecordLike,
  key: string,
): GroupSession {
  const record = readRecord(params, key);
  const statusRaw = readString(record, "status");
  if (!isSessionStatus(statusRaw)) {
    throw new GraphQLError(
      `Invalid group session status: expected pending, active, paused, completed, or failed; got ${JSON.stringify(statusRaw)}`,
    );
  }
  return {
    id: readString(record, "id"),
    projectPath: readString(record, "projectPath"),
    prompt: readString(record, "prompt"),
    status: statusRaw,
    dependsOn: readOptionalStringArray(record, "dependsOn") ?? [],
    createdAt: readString(record, "createdAt"),
    startedAt: readOptionalString(record, "startedAt"),
    completedAt: readOptionalString(record, "completedAt"),
    cost: readOptionalNumber(record, "cost"),
  };
}

export function readString(record: RecordLike, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new GraphQLError(`Expected non-empty string for "${key}"`);
  }
  return value;
}

export function readOptionalString(
  record: RecordLike,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readNumber(record: RecordLike, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new GraphQLError(`Expected number for "${key}"`);
  }
  return value;
}

export function readOptionalNumber(
  record: RecordLike,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function readOptionalBoolean(
  record: RecordLike,
  key: string,
): boolean | undefined {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

export function readOptionalStringArray(
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

export function readOptionalSessionMode(
  record: RecordLike,
  key: string,
): SessionMode | undefined {
  const value = readOptionalString(record, key);
  if (value === "continue" || value === "new") {
    return value;
  }
  return undefined;
}

export function readRecord(record: RecordLike, key: string): RecordLike {
  const value = record[key];
  return asRecord(value);
}

export function asRecord(value: unknown): RecordLike {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as RecordLike;
}

export function isQueueStatus(value: string | undefined): value is QueueStatus {
  return (
    value === "pending" ||
    value === "running" ||
    value === "paused" ||
    value === "stopped" ||
    value === "completed" ||
    value === "failed"
  );
}

export function isSessionStatus(value: string): value is SessionStatus {
  return (
    value === "pending" ||
    value === "active" ||
    value === "paused" ||
    value === "completed" ||
    value === "failed"
  );
}

export function isGroupStatus(value: string | undefined): value is GroupStatus {
  return (
    value === "created" ||
    value === "running" ||
    value === "paused" ||
    value === "completed" ||
    value === "failed" ||
    value === "archived" ||
    value === "deleted"
  );
}

export function isActivityStatus(
  value: string | undefined,
): value is ActivityStatus {
  return (
    value === "working" || value === "waiting_user_response" || value === "idle"
  );
}
