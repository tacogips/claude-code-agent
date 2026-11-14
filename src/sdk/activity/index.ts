/**
 * Activity tracking module.
 *
 * @module sdk/activity
 */

export type {
  HookInput,
  UserPromptSubmitInput,
  PermissionRequestInput,
  StopInput,
  HookInputBase,
} from "./hook-types";

export type { ActivityManagerOptions } from "./manager";
export { ActivityManager } from "./manager";
export type { ActivityStoreService, ActivityStoreOptions } from "./store";
export type {
  TranscriptAnalyzer,
  TranscriptAnalyzerOptions,
} from "./transcript-analyzer";
