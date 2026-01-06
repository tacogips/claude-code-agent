# Error Handling Patterns

Modern TypeScript error handling prioritizes type safety and explicit error states over traditional try-catch patterns.

## Result Type Pattern

The Result type makes error states explicit in the type system. Invalid states become impossible to represent.

### Basic Implementation

```typescript
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Usage
function parseJson<T>(json: string): Result<T, SyntaxError> {
  try {
    return { ok: true, value: JSON.parse(json) as T };
  } catch (e) {
    return { ok: false, error: e as SyntaxError };
  }
}

// Handling
const result = parseJson<User>(input);
if (result.ok) {
  console.log(result.value.name); // Type-safe access
} else {
  console.error(result.error.message);
}
```

### With neverthrow Library

> **Project Note**: This project uses neverthrow via `src/result.ts`. Import from `"../result"` or `"./result"` rather than `"neverthrow"` directly. The wrapper provides backward-compatible standalone functions, though native methods are preferred for new code (e.g., `result.isOk()` instead of `isOk(result)`).

For production use, consider [neverthrow](https://github.com/supermacro/neverthrow):

```typescript
import { ok, err, Result, ResultAsync } from 'neverthrow';

// Sync operations
function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) {
    return err(new Error('Division by zero'));
  }
  return ok(a / b);
}

// Async operations with ResultAsync
function fetchUser(id: string): ResultAsync<User, ApiError> {
  return ResultAsync.fromPromise(
    fetch(`/api/users/${id}`).then(r => r.json()),
    (e) => new ApiError('Failed to fetch user', e)
  );
}

// Chaining operations
const result = await fetchUser('123')
  .andThen(user => validateUser(user))
  .map(user => user.profile)
  .mapErr(e => logError(e));
```

## Discriminated Unions for Error States

Model different error types explicitly:

```typescript
type ApiError =
  | { type: 'network'; message: string; retryable: true }
  | { type: 'validation'; fields: string[]; retryable: false }
  | { type: 'auth'; reason: 'expired' | 'invalid'; retryable: false }
  | { type: 'notFound'; resource: string; retryable: false };

function handleError(error: ApiError): void {
  switch (error.type) {
    case 'network':
      // TypeScript knows: error.retryable is true
      scheduleRetry();
      break;
    case 'validation':
      // TypeScript knows: error.fields exists
      highlightFields(error.fields);
      break;
    case 'auth':
      // TypeScript knows: error.reason is 'expired' | 'invalid'
      redirectToLogin(error.reason);
      break;
    case 'notFound':
      showNotFound(error.resource);
      break;
    default:
      // Exhaustive check - compile error if case missed
      const _exhaustive: never = error;
      throw new Error(`Unhandled error type: ${_exhaustive}`);
  }
}
```

## Custom Error Classes

When you need error hierarchies:

```typescript
// Base error with common properties
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly retryable: boolean;

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Specific error types
class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly retryable = false;

  constructor(
    message: string,
    readonly fields: Record<string, string[]>
  ) {
    super(message);
  }
}

class NetworkError extends AppError {
  readonly code = 'NETWORK_ERROR';
  readonly retryable = true;

  constructor(message: string, cause?: unknown) {
    super(message, cause);
  }
}

// Type guard for error checking
function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
```

## Safe Catch Handling

TypeScript's `useUnknownInCatchVariables` makes caught values `unknown`:

```typescript
// BAD - assumes error is Error
try {
  await riskyOperation();
} catch (e) {
  console.log(e.message); // Error: 'e' is of type 'unknown'
}

// GOOD - narrow the type explicitly
try {
  await riskyOperation();
} catch (e) {
  if (e instanceof Error) {
    console.log(e.message);
  } else if (typeof e === 'string') {
    console.log(e);
  } else {
    console.log('Unknown error occurred');
  }
}

// BETTER - use a helper function
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

try {
  await riskyOperation();
} catch (e) {
  console.error(getErrorMessage(e));
}
```

## When to Use Each Pattern

| Scenario | Recommended Pattern |
|----------|---------------------|
| Expected failures (parsing, validation) | Result type |
| Async operations with recoverable errors | ResultAsync (neverthrow) |
| Multiple distinct error types | Discriminated unions |
| Error hierarchies with inheritance | Custom error classes |
| Truly exceptional situations | throw + try-catch |
| External library errors | Wrap in Result at boundary |

## Anti-Patterns to Avoid

```typescript
// BAD: Throwing for control flow
function findUser(id: string): User {
  const user = db.find(id);
  if (!user) throw new Error('Not found'); // Control flow via exception
  return user;
}

// GOOD: Return explicit result
function findUser(id: string): Result<User, NotFoundError> {
  const user = db.find(id);
  if (!user) return err(new NotFoundError(id));
  return ok(user);
}

// BAD: Swallowing errors
try {
  await operation();
} catch {
  // Silent failure - no logging, no handling
}

// GOOD: Always handle or propagate
try {
  await operation();
} catch (e) {
  logger.error('Operation failed', { error: e });
  throw e; // or return err(...)
}

// BAD: Generic error messages
return err(new Error('Something went wrong'));

// GOOD: Specific, actionable messages
return err(new ValidationError('Email format invalid', { email: ['Must be valid email'] }));
```

## Logging

This project uses [consola](https://github.com/unjs/consola) for structured logging via `src/logger.ts`:

```typescript
import { logger, createTaggedLogger } from "./logger";

// Basic logging
logger.info("Server started");
logger.debug("Debug info", { details });
logger.error("Error occurred", error);

// Tagged logging for specific modules
const sdkLogger = createTaggedLogger("sdk");
sdkLogger.info("SDK initialized"); // Output: [sdk] SDK initialized
```

Log levels are configured via environment:
- `LOG_LEVEL` environment variable (explicit override)
- `NODE_ENV=production`: info level
- `NODE_ENV=test`: warn level (quieter tests)
- Default: debug level

Available log levels (from least to most verbose):
`silent` < `fatal` < `error` < `warn` < `log` < `info` < `success` < `debug` < `trace` < `verbose`

## References

- [neverthrow](https://github.com/supermacro/neverthrow) - Type-Safe Errors for JS & TypeScript
- [consola](https://github.com/unjs/consola) - Elegant Console Logger for Node.js and Browser
- [Effect.ts](https://effect.website/) - Comprehensive functional programming library
- [Error Handling Comparison](https://devalade.me/blog/error-handling-in-typescript-neverthrow-try-catch-and-alternative-like-effec-ts.mdx)
