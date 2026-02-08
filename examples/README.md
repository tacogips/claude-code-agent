# Integration Examples

Examples for integrating `claude-code-agent` SDK with web frameworks and frontend libraries.

## Examples

### `hono-rest-api.ts`

REST API using [Hono](https://hono.dev/) framework. Demonstrates:
- Session listing with pagination
- Session detail retrieval
- Transcript reading with offset/limit
- SSE streaming endpoint

### `sse-bridge.ts`

Server-Sent Events bridge using Bun.serve. Demonstrates:
- Converting `SessionUpdateReceiver` polling into SSE streams
- Proper SSE message formatting with event types and IDs
- Client disconnect handling

### `svelte5-store.ts`

[Svelte 5](https://svelte.dev/) integration patterns. Demonstrates:
- Reactive store with `$state` bridge pattern
- `$derived` values for computed properties
- Full component example with `onMount`/`onDestroy` lifecycle

### `react-integration.tsx`

[React 18+](https://react.dev/) integration. Demonstrates:
- `useSyncExternalStore` pattern for concurrent rendering safety
- Custom `useSessionUpdates` hook
- Complete `SessionViewer` component

## Prerequisites

```bash
# Install the SDK
bun add claude-code-agent

# For Hono example
bun add hono

# For React example
bun add react @types/react
```

## Running Examples

```bash
# Hono REST API (port 3000)
bun run examples/hono-rest-api.ts

# SSE Bridge (port 3001)
bun run examples/sse-bridge.ts
```

The Svelte and React examples are reference patterns meant to be adapted into your application's component structure.
