/**
 * Hook Input Types for Claude Code Activity Tracking
 *
 * Type definitions and parsing functions for Claude Code hook inputs.
 * These types represent the JSON data sent to hooks via stdin when
 * specific events occur during Claude Code execution.
 *
 * @module sdk/activity/hook-types
 */

import { Result, ok, err } from "../../result";

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
export type HookInput =
  | UserPromptSubmitInput
  | PermissionRequestInput
  | StopInput;

/**
 * Parse and validate hook input from stdin JSON.
 *
 * Validates all required fields and ensures the hook_event_name is recognized.
 *
 * @param json - JSON string from stdin
 * @returns Result with parsed HookInput or Error with validation message
 */
export function parseHookInput(json: string): Result<HookInput, Error> {
  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return err(
      new Error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`),
    );
  }

  // Check basic structure
  if (typeof parsed !== "object" || parsed === null) {
    return err(new Error("Hook input must be an object"));
  }

  const obj = parsed as Record<string, unknown>;

  // Validate common fields
  if (typeof obj["session_id"] !== "string") {
    return err(new Error("Missing or invalid session_id field"));
  }

  if (typeof obj["transcript_path"] !== "string") {
    return err(new Error("Missing or invalid transcript_path field"));
  }

  if (typeof obj["cwd"] !== "string") {
    return err(new Error("Missing or invalid cwd field"));
  }

  if (typeof obj["permission_mode"] !== "string") {
    return err(new Error("Missing or invalid permission_mode field"));
  }

  if (typeof obj["hook_event_name"] !== "string") {
    return err(new Error("Missing or invalid hook_event_name field"));
  }

  const hookEventName = obj["hook_event_name"];

  // Validate and construct specific hook type
  switch (hookEventName) {
    case "UserPromptSubmit": {
      // Optional prompt field
      if (obj["prompt"] !== undefined && typeof obj["prompt"] !== "string") {
        return err(
          new Error("Invalid prompt field: must be string if present"),
        );
      }

      const result: UserPromptSubmitInput = {
        session_id: obj["session_id"] as string,
        transcript_path: obj["transcript_path"] as string,
        cwd: obj["cwd"] as string,
        permission_mode: obj["permission_mode"] as string,
        hook_event_name: "UserPromptSubmit",
        ...(typeof obj["prompt"] === "string" ? { prompt: obj["prompt"] } : {}),
      };

      return ok(result);
    }

    case "PermissionRequest": {
      // Required tool_name
      if (typeof obj["tool_name"] !== "string") {
        return err(new Error("Missing or invalid tool_name field"));
      }

      // Required tool_input
      if (typeof obj["tool_input"] !== "object" || obj["tool_input"] === null) {
        return err(new Error("Missing or invalid tool_input field"));
      }

      return ok({
        session_id: obj["session_id"],
        transcript_path: obj["transcript_path"],
        cwd: obj["cwd"],
        permission_mode: obj["permission_mode"],
        hook_event_name: "PermissionRequest",
        tool_name: obj["tool_name"],
        tool_input: obj["tool_input"] as Record<string, unknown>,
      });
    }

    case "Stop": {
      return ok({
        session_id: obj["session_id"],
        transcript_path: obj["transcript_path"],
        cwd: obj["cwd"],
        permission_mode: obj["permission_mode"],
        hook_event_name: "Stop",
      });
    }

    default:
      return err(
        new Error(`Unknown hook_event_name: ${String(hookEventName)}`),
      );
  }
}

/**
 * Type guard for UserPromptSubmit.
 *
 * @param input - Hook input to check
 * @returns True if input is UserPromptSubmitInput
 */
export function isUserPromptSubmit(
  input: HookInput,
): input is UserPromptSubmitInput {
  return input.hook_event_name === "UserPromptSubmit";
}

/**
 * Type guard for PermissionRequest.
 *
 * @param input - Hook input to check
 * @returns True if input is PermissionRequestInput
 */
export function isPermissionRequest(
  input: HookInput,
): input is PermissionRequestInput {
  return input.hook_event_name === "PermissionRequest";
}

/**
 * Type guard for Stop.
 *
 * @param input - Hook input to check
 * @returns True if input is StopInput
 */
export function isStop(input: HookInput): input is StopInput {
  return input.hook_event_name === "Stop";
}
