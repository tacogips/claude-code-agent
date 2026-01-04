# Example: CLI Output Format

**Status**: `Pending`
**Created**: 2025-01-01
**Resolved**: -

> This is a template example. Delete this file when creating actual pending items.

## Question/Issue

What output format should the CLI use for displaying session information?

## Options

### Option A: Plain Text

```
Session: abc123
Status: Active
Duration: 5m 32s
Tools Used: 15
```

- Simple and readable
- Easy to parse with grep/awk
- Limited structure for complex data

### Option B: JSON

```json
{
  "session": "abc123",
  "status": "active",
  "duration_seconds": 332,
  "tools_used": 15
}
```

- Machine-readable
- Structured data
- Requires `jq` for human readability

### Option C: Table Format

```
| Field      | Value      |
|------------|------------|
| Session    | abc123     |
| Status     | Active     |
| Duration   | 5m 32s     |
| Tools Used | 15         |
```

- Visually organized
- Good for terminal display
- More complex to implement

## Recommendation

(Awaiting user input)

## Resolution

(Pending user decision)
