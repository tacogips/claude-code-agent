# Integration Examples

Examples for integrating `claude-code-agent` SDK with frontend libraries.

## Examples

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

# For React example
bun add react @types/react
```

## Running Examples

The Svelte and React examples are reference patterns meant to be adapted into your application's component structure.
