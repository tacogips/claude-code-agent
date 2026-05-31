/**
 * Hook Input Types for Claude Code Activity Tracking
 *
 * Type definitions and parsing functions for Claude Code hook inputs.
 * These types represent the JSON data sent to hooks via stdin when
 * specific events occur during Claude Code execution.
 *
 * @module sdk/activity/hook-types
 */
import { type Result } from "../../result";
/**
 * Common fields for all hook inputs.
 */
export interface HookInputBase {
    readonly session_id: string;
    readonly transcript_path: string;
    readonly cwd: string;
    readonly permission_mode: string;
    readonly hook_event_name: string;
}
/**
 * UserPromptSubmit hook input.
 *
 * Received when the user submits a prompt to Claude Code.
 * Indicates the session is now working on the user's request.
 */
export interface UserPromptSubmitInput extends HookInputBase {
    readonly hook_event_name: "UserPromptSubmit";
    readonly prompt?: string;
}
/**
 * PermissionRequest hook input.
 *
 * Received when Claude Code requests permission to execute a tool.
 * Indicates the session is waiting for user response (approval/denial).
 */
export interface PermissionRequestInput extends HookInputBase {
    readonly hook_event_name: "PermissionRequest";
    readonly tool_name: string;
    readonly tool_input: Record<string, unknown>;
}
/**
 * Stop hook input.
 *
 * Received when Claude Code execution completes or stops.
 * May indicate idle or waiting_user_response depending on transcript content.
 */
export interface StopInput extends HookInputBase {
    readonly hook_event_name: "Stop";
}
/**
 * Union of all hook inputs.
 *
 * Discriminated union type based on hook_event_name field.
 */
export type HookInput = UserPromptSubmitInput | PermissionRequestInput | StopInput;
/**
 * Parse and validate hook input from stdin JSON.
 *
 * Validates all required fields and ensures the hook_event_name is recognized.
 *
 * @param json - JSON string from stdin
 * @returns Result with parsed HookInput or Error with validation message
 */
export declare function parseHookInput(json: string): Result<HookInput, Error>;
/**
 * Type guard for UserPromptSubmit.
 *
 * @param input - Hook input to check
 * @returns True if input is UserPromptSubmitInput
 */
export declare function isUserPromptSubmit(input: HookInput): input is UserPromptSubmitInput;
/**
 * Type guard for PermissionRequest.
 *
 * @param input - Hook input to check
 * @returns True if input is PermissionRequestInput
 */
export declare function isPermissionRequest(input: HookInput): input is PermissionRequestInput;
/**
 * Type guard for Stop.
 *
 * @param input - Hook input to check
 * @returns True if input is StopInput
 */
export declare function isStop(input: HookInput): input is StopInput;
//# sourceMappingURL=hook-types.d.ts.map