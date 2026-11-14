# Example: Database Selection

**Status**: `Resolved`
**Created**: 2025-01-01
**Resolved**: 2025-01-02

> This is a template example. Delete this file when creating actual Q&A items.

## Question/Issue

Which database should we use for storing session data?

## Options

### Option A: SQLite

- Lightweight, file-based database
- No separate server process required
- Good for single-user or local applications
- Limited concurrent write performance

### Option B: PostgreSQL

- Full-featured relational database
- Excellent concurrent access support
- Requires separate server setup
- Better for multi-user or distributed systems

### Option C: In-Memory (Map/Object)

- Fastest access speed
- No persistence across restarts
- Simplest implementation
- Only suitable for temporary/cache data

## Recommendation

Option A (SQLite) is recommended for this project because:
- Session data is primarily read-heavy
- Single-user CLI tool does not require high concurrency
- File-based storage simplifies deployment

## Resolution

Selected **Option A: SQLite** based on the recommendation.
Additional note: Will use better-sqlite3 for synchronous API.
