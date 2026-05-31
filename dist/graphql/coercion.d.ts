/**
 * Coerce arbitrary GraphQL `command` payloads into typed values.
 *
 * @module graphql/coercion
 */
import type { GroupSession, GroupStatus } from "../sdk/group/types";
import type { SessionMode } from "../sdk/queue/types";
import type { QueueStatus } from "../repository/queue-repository";
import type { ActivityStatus } from "../types/activity";
import type { SessionStatus } from "../types/session";
import type { RecordLike } from "./types";
export declare function readGroupSession(params: RecordLike, key: string): GroupSession;
export declare function readString(record: RecordLike, key: string): string;
export declare function readOptionalString(record: RecordLike, key: string): string | undefined;
export declare function readNumber(record: RecordLike, key: string): number;
export declare function readOptionalNumber(record: RecordLike, key: string): number | undefined;
export declare function readOptionalBoolean(record: RecordLike, key: string): boolean | undefined;
export declare function readOptionalStringArray(record: RecordLike, key: string): readonly string[] | undefined;
export declare function readOptionalSessionMode(record: RecordLike, key: string): SessionMode | undefined;
export declare function readRecord(record: RecordLike, key: string): RecordLike;
export declare function asRecord(value: unknown): RecordLike;
export declare function isQueueStatus(value: string | undefined): value is QueueStatus;
export declare function isSessionStatus(value: string): value is SessionStatus;
export declare function isGroupStatus(value: string | undefined): value is GroupStatus;
export declare function isActivityStatus(value: string | undefined): value is ActivityStatus;
//# sourceMappingURL=coercion.d.ts.map