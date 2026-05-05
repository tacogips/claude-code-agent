# SDK and CLI Specification

This document describes the current local SDK, GraphQL executor, token metadata manager, and CLI interface.

---

## 1. Package Boundary

claude-code-agent exposes local APIs only:

```
src/
+-- sdk/        # Public TypeScript SDK
+-- cli/        # Command-line interface
+-- graphql/    # Local GraphQL schema and executor
+-- auth/       # Local token metadata management
```

The package exposes no network listener.

---

## 2. SDK Overview

The SDK provides a local facade for:

- Session reading and transcript access
- Session group orchestration
- Command queue management and execution
- Bookmarks
- Activity status
- File-change extraction
- Event emission
- Programmatic MCP/tool registration

The CLI is a thin wrapper around the SDK.

---

## 3. Local GraphQL Executor

GraphQL is used as an in-process query and command surface. It is executed by the CLI or embedding application.

```bash
claude-code-agent graphql 'query { command(name: "session.list") }'
```

Typed session queries are also available:

```graphql
query {
  sessions(status: "running") {
    total
    nodes {
      id
      status
      messageCount
    }
  }
}
```

GraphQL execution requires a local SDK context. It does not open a network listener.

---

## 4. Token Metadata Management

Token commands manage local token metadata:

```bash
claude-code-agent token create --name ci --permissions session:read
claude-code-agent token list
claude-code-agent token revoke <token-id>
claude-code-agent token rotate <token-id>
```

Token plaintext is returned only at creation or rotation time. Stored metadata contains SHA-256 hashes, timestamps, and permissions.

---

## 5. CLI Surface

| Entity | Actions |
|--------|---------|
| `session` | `list`, `show`, `add`, `watch`, `run` |
| `group` | `create`, `list`, `run`, `watch`, `pause`, `resume` |
| `queue` | `create`, `list`, `show`, `run`, `pause`, `resume`, `stop`, `delete` |
| `queue command` | `add`, `edit`, `remove`, `move`, `toggle-mode` |
| `bookmark` | `add`, `list`, `show`, `search`, `delete` |
| `files` | changed-file inspection commands |
| `activity` | `update`, `status`, `list`, `cleanup`, `setup` |
| `auth` | credential import/export/verify commands |
| `token` | `create`, `list`, `revoke`, `rotate` |
| `graphql` | local GraphQL query execution |
| `version` | version and dependency information |

---

## 6. Error Handling

- CLI commands return exit code `0` for success.
- CLI commands return exit code `1` for execution errors.
- CLI commands return exit code `2` for invalid arguments.
- SDK APIs expose typed errors or explicit result values where appropriate.

---

## 7. Security Boundary

claude-code-agent reads Claude Code transcripts and writes only its own local metadata. It does not expose local state over HTTP.
