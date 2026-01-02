# TypeScript Data Models Design

This document outlines the TypeScript type definitions required for the Claude Code file reader.

## Core Types

### ClaudeConfig (~/.claude.json)

```typescript
interface ClaudeConfig {
  numStartups?: number;
  installMethod?: string;
  autoUpdates?: boolean;
  editorMode?: string;
  customApiKeyResponses?: CustomApiKeyResponses;
  tipsHistory?: Record<string, number>;
  promptQueueUseCount?: number;
  showExpandedTodos?: boolean;
  cachedStatsigGates?: Record<string, boolean>;
  cachedDynamicConfigs?: Record<string, unknown>;
  cachedGrowthBookFeatures?: Record<string, unknown>;
  fallbackAvailableWarningThreshold?: number;
  projects?: Record<string, ProjectConfig>;
  mcpServers?: Record<string, McpServer>;
  bypassPermissionsModeAccepted?: boolean;
  cachedChangelog?: unknown;
  changelogLastFetched?: number;
  firstStartTime?: number;
  hasAvailableSubscription?: boolean;
  hasCompletedOnboarding?: boolean;
  hasOpusPlanDefault?: boolean;
  hasUsedBackslashReturn?: boolean;
  isQualifiedForDataSharing?: boolean;
  lastOnboardingVersion?: string;
  lastReleaseNotesSeen?: string;
  oauthAccount?: unknown;
  s1mAccessCache?: unknown;
  subscriptionNoticeCount?: number;
  userId?: string;
}

interface CustomApiKeyResponses {
  approved: string[];
  rejected: string[];
}
```

### Project Configuration

```typescript
interface ProjectConfig {
  allowedTools?: string[];
  mcpContextUris?: string[];
  mcpServers?: Record<string, McpServer>;
  enabledMcpjsonServers?: string[];
  disabledMcpjsonServers?: string[];
  hasTrustDialogAccepted?: boolean;
  projectOnboardingSeenCount?: number;
  hasClaudeMdExternalIncludesApproved?: boolean;
  hasClaudeMdExternalIncludesWarningShown?: boolean;
  hasCompletedProjectOnboarding?: boolean;
  exampleFiles?: string[];
  exampleFilesGeneratedAt?: number;
  history?: HistoryEntry[];
  lastCost?: number;
  lastAPIDuration?: number;
  lastToolDuration?: number;
  lastDuration?: number;
  lastLinesAdded?: number;
  lastLinesRemoved?: number;
  lastSessionId?: string;
  lastTotalInputTokens?: number;
  lastTotalOutputTokens?: number;
  lastTotalCacheCreationInputTokens?: number;
  lastTotalCacheReadInputTokens?: number;
  lastTotalWebSearchRequests?: number;
}

interface HistoryEntry {
  display: string;
  pastedContents?: Record<string, PastedContent>;
}

interface PastedContent {
  id: number;
  type: string;
  content: string;
}

interface McpServer {
  type?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}
```

### Settings

```typescript
interface ClaudeSettings {
  permissions?: Permissions;
  env?: Record<string, string>;
  hooks?: Record<HookEvent, Record<string, string>>;
  model?: string;
  apiKeyHelper?: string;
  forceLoginMethod?: LoginMethod;
  forceLoginOrgUUID?: string;
  statusLine?: unknown;
  outputStyle?: string;
  cleanupPeriodDays?: number;
  includeCoAuthoredBy?: boolean;
  disableAllHooks?: boolean;
  enableAllProjectMcpServers?: boolean;
  enabledMcpjsonServers?: string[];
  disabledMcpjsonServers?: string[];
  awsAuthRefresh?: string;
  awsCredentialExport?: string;
  enabledPlugins?: Record<string, boolean>;
  alwaysThinkingEnabled?: boolean;
}

interface Permissions {
  allow?: string[];
  deny?: string[];
  ask?: string[];
  additionalDirectories?: string[];
  defaultMode?: PermissionMode;
  disableBypassPermissionsMode?: string;
}

type PermissionMode = "allow" | "deny" | "ask";

type HookEvent =
  | "PreToolUse"
  | "PostToolUse"
  | "Notification"
  | "UserPromptSubmit"
  | "Stop"
  | "SessionStart"
  | "SessionEnd";

type LoginMethod = "claudeai" | "console";
```

### Session Transcript Types

```typescript
// Union type for all session entry types
type SessionEntry =
  | SummaryEntry
  | FileHistorySnapshotEntry
  | UserMessageEntry
  | AssistantMessageEntry;

interface BaseEntry {
  uuid: string;
  timestamp: string;
  sessionId: string;
  cwd: string;
  version: string;
}

interface SummaryEntry {
  type: "summary";
  summary: string;
  leafUuid: string;
}

interface FileHistorySnapshotEntry {
  type: "file-history-snapshot";
  messageId: string;
  snapshot: FileSnapshot;
  isSnapshotUpdate: boolean;
}

interface FileSnapshot {
  messageId: string;
  trackedFileBackups: Record<string, unknown>;
  timestamp: string;
}

interface MessageEntry extends BaseEntry {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  gitBranch?: string;
  agentId?: string;
  slug?: string;
}

interface UserMessageEntry extends MessageEntry {
  type: "user";
  message: UserMessage;
  thinkingMetadata?: ThinkingMetadata;
  todos?: TodoItem[];
}

interface AssistantMessageEntry extends MessageEntry {
  type: "assistant";
  message: AssistantMessage;
  requestId?: string;
  toolUseResult?: ToolUseResult;
}

interface UserMessage {
  role: "user";
  content: string | ContentBlock[];
}

interface AssistantMessage {
  model: string;
  id: string;
  type: "message";
  role: "assistant";
  content: ContentBlock[];
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: TokenUsage;
}

type ContentBlock =
  | TextContent
  | ThinkingContent
  | ToolUseContent
  | ImageContent;

interface TextContent {
  type: "text";
  text: string;
}

interface ThinkingContent {
  type: "thinking";
  thinking: string;
  signature: string;
}

interface ToolUseContent {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ImageContent {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

interface TokenUsage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
  cache_creation?: {
    ephemeral_5m_input_tokens: number;
    ephemeral_1h_input_tokens: number;
  };
  service_tier?: string;
}

interface ThinkingMetadata {
  level: string;
  disabled: boolean;
  triggers: unknown[];
}

interface ToolUseResult {
  stdout?: string;
  stderr?: string;
  interrupted?: boolean;
  isImage?: boolean;
}
```

### Todo Types

```typescript
interface TodoItem {
  content: string;
  status: TodoStatus;
  priority?: string;
  id?: string;
  activeForm?: string;
}

type TodoStatus = "pending" | "in_progress" | "completed";
```

### Global History

```typescript
interface GlobalHistoryEntry {
  display: string;
  pastedContents: Record<string, PastedContent>;
  timestamp: number;
  project: string;
}
```

### Plugin Types

```typescript
interface PluginsConfig {
  version: number;
  plugins: Record<string, PluginInstallation[]>;
}

interface PluginInstallation {
  scope: "user" | "project";
  projectPath?: string;
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  isLocal: boolean;
}
```

### Project/Session Identifiers

```typescript
// Project ID is path with / replaced by -
type ProjectId = string;

// Session ID is a UUID
type SessionId = string;

// Agent ID is a short hex string
type AgentId = string;

interface ProjectSession {
  projectId: ProjectId;
  sessionId: SessionId;
  filePath: string;
  isAgent: boolean;
  agentId?: AgentId;
}

interface ProjectHistory {
  sessions: ProjectSession[];
}
```

## Utility Types

```typescript
// Helper for parsing project IDs
function projectIdFromPath(path: string): ProjectId {
  return path.replace(/\//g, "-");
}

function pathFromProjectId(projectId: ProjectId): string {
  return projectId.replace(/-/g, "/");
}

// Session file path pattern
function sessionFilePath(
  basePath: string,
  projectId: ProjectId,
  sessionId: SessionId
): string {
  return `${basePath}/projects/${projectId}/${sessionId}.jsonl`;
}

function agentFilePath(
  basePath: string,
  projectId: ProjectId,
  agentId: AgentId
): string {
  return `${basePath}/projects/${projectId}/agent-${agentId}.jsonl`;
}
```

## Zod Schemas (for runtime validation)

For runtime validation, we should use Zod schemas that mirror these TypeScript types. This provides:

1. Type-safe parsing of JSON files
2. Helpful error messages for malformed data
3. Default value handling
4. Transformation capabilities

Example:

```typescript
import { z } from "zod";

const McpServerSchema = z.object({
  type: z.string().optional(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

const ProjectConfigSchema = z.object({
  allowedTools: z.array(z.string()).optional(),
  mcpServers: z.record(McpServerSchema).optional(),
  // ... rest of fields
});

const ClaudeConfigSchema = z.object({
  numStartups: z.number().optional(),
  installMethod: z.string().optional(),
  projects: z.record(ProjectConfigSchema).optional(),
  mcpServers: z.record(McpServerSchema).optional(),
  // ... rest of fields
});
```

## Notes

1. All fields should be optional with `?` to handle partial data
2. Use `unknown` for dynamic/untyped fields to maintain flexibility
3. Consider using branded types for IDs (ProjectId, SessionId) for type safety
4. JSONL parsing requires line-by-line processing with individual JSON parsing
5. Large files (history.jsonl, session files) should be streamed, not loaded entirely
