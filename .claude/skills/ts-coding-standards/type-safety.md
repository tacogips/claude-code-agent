# Type Safety Best Practices

This guide covers modern TypeScript type safety patterns that leverage the strictest compiler settings.

## Strict Compiler Options

These options are mandatory for this project:

### `noUncheckedIndexedAccess`

Array and object indexed access may return `undefined`:

```typescript
const items = ['a', 'b', 'c'];

// BAD - assumes index exists
const first = items[0]; // Type: string | undefined (not just string)
console.log(first.toUpperCase()); // Error: possibly undefined

// GOOD - check before use
const first = items[0];
if (first !== undefined) {
  console.log(first.toUpperCase()); // Safe
}

// GOOD - use at() with nullish coalescing
const first = items.at(0) ?? 'default';
```

### `exactOptionalPropertyTypes`

Optional properties and `undefined` are different:

```typescript
interface Config {
  name: string;
  timeout?: number; // May be absent, but if present must be number
}

// BAD - cannot assign undefined to optional property
const config: Config = {
  name: 'app',
  timeout: undefined, // Error with exactOptionalPropertyTypes
};

// GOOD - omit the property entirely
const config: Config = {
  name: 'app',
  // timeout is absent, not undefined
};

// If undefined is valid, be explicit
interface ConfigWithUndefined {
  name: string;
  timeout?: number | undefined; // Explicitly allows undefined
}
```

### `noPropertyAccessFromIndexSignature`

Use bracket notation for index signatures:

```typescript
interface Headers {
  'content-type': string;
  [key: string]: string;
}

const headers: Headers = { 'content-type': 'application/json' };

// BAD - dot notation for index signature
const custom = headers.customHeader; // Error

// GOOD - bracket notation makes dynamic access explicit
const custom = headers['customHeader'];
```

## Branded Types

Prevent mixing structurally identical but semantically different types:

```typescript
// Define brand types
type Brand<T, B extends string> = T & { readonly __brand: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type Email = Brand<string, 'Email'>;

// Constructor functions with validation
function createUserId(id: string): UserId {
  if (!id.match(/^user_[a-z0-9]+$/)) {
    throw new Error('Invalid user ID format');
  }
  return id as UserId;
}

function createEmail(email: string): Email {
  if (!email.includes('@')) {
    throw new Error('Invalid email format');
  }
  return email as Email;
}

// Usage - cannot mix different ID types
function getUser(id: UserId): User { /* ... */ }
function getOrder(id: OrderId): Order { /* ... */ }

const userId = createUserId('user_abc123');
const orderId = 'order_xyz' as OrderId;

getUser(userId);   // OK
getUser(orderId);  // Error: OrderId not assignable to UserId
```

## Discriminated Unions

Model state machines and complex types:

```typescript
// API Response states
type ApiResponse<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function renderResponse<T>(response: ApiResponse<T>): string {
  switch (response.status) {
    case 'idle':
      return 'Ready to fetch';
    case 'loading':
      return 'Loading...';
    case 'success':
      return `Data: ${JSON.stringify(response.data)}`;
    case 'error':
      return `Error: ${response.error.message}`;
  }
}

// Form field states
type FieldState =
  | { touched: false }
  | { touched: true; valid: true; value: string }
  | { touched: true; valid: false; errors: string[] };
```

## Type Guards

Narrow types safely at runtime:

```typescript
// User-defined type guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Type guard for objects
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).name === 'string'
  );
}

// Assertion function (throws if invalid)
function assertNonNull<T>(value: T | null | undefined): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error('Value must not be null or undefined');
  }
}

// Usage
function processValue(value: unknown): void {
  if (isUser(value)) {
    console.log(value.name); // Type: User
  }

  const maybeNull: string | null = getValue();
  assertNonNull(maybeNull);
  console.log(maybeNull.length); // Type: string (not null)
}
```

## Const Assertions

Create narrow literal types:

```typescript
// Without const assertion
const colors = ['red', 'green', 'blue']; // Type: string[]

// With const assertion
const colors = ['red', 'green', 'blue'] as const; // Type: readonly ['red', 'green', 'blue']

// Derive types from const values
type Color = (typeof colors)[number]; // Type: 'red' | 'green' | 'blue'

// Object with const assertion
const config = {
  endpoint: '/api',
  timeout: 5000,
  methods: ['GET', 'POST'],
} as const;

type Config = typeof config;
// Type: {
//   readonly endpoint: '/api';
//   readonly timeout: 5000;
//   readonly methods: readonly ['GET', 'POST'];
// }
```

## Template Literal Types

Create type-safe string patterns:

```typescript
// Event names
type EventName = `on${Capitalize<string>}`;
const onClick: EventName = 'onClick';    // OK
const click: EventName = 'click';        // Error

// CSS units
type CssUnit = 'px' | 'em' | 'rem' | '%';
type CssValue = `${number}${CssUnit}`;
const width: CssValue = '100px';  // OK
const bad: CssValue = '100';      // Error

// API routes
type ApiRoute = `/api/${string}`;
type UserRoute = `/api/users/${string}`;
```

## Mapped Types

Transform existing types:

```typescript
// Make all properties optional
type Optional<T> = {
  [K in keyof T]?: T[K];
};

// Make all properties readonly
type Immutable<T> = {
  readonly [K in keyof T]: T[K] extends object ? Immutable<T[K]> : T[K];
};

// Extract only function properties
type Methods<T> = {
  [K in keyof T as T[K] extends (...args: unknown[]) => unknown ? K : never]: T[K];
};

// Create validation schema from type
type ValidationSchema<T> = {
  [K in keyof T]: (value: T[K]) => boolean;
};

interface User {
  name: string;
  age: number;
}

const userValidation: ValidationSchema<User> = {
  name: (v) => v.length > 0,
  age: (v) => v >= 0,
};
```

## Readonly and Immutability

Prevent accidental mutations:

```typescript
// Readonly arrays
function processItems(items: readonly string[]): void {
  items.push('new'); // Error: push does not exist on readonly
  const copy = [...items, 'new']; // OK: creates new array
}

// Readonly objects
interface Config {
  readonly apiKey: string;
  readonly endpoints: readonly string[];
}

// Deep readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

## Anti-Patterns to Avoid

```typescript
// BAD: Using 'any'
function parse(data: any): any { /* ... */ }

// GOOD: Use 'unknown' and narrow
function parse(data: unknown): Result<ParsedData, ParseError> {
  if (!isValidData(data)) {
    return err(new ParseError('Invalid data'));
  }
  return ok(data as ParsedData);
}

// BAD: Type assertions without validation
const user = response.data as User;

// GOOD: Validate before asserting
if (!isUser(response.data)) {
  throw new Error('Invalid user data');
}
const user = response.data; // Type already narrowed

// BAD: Non-null assertion without guarantee
const element = document.querySelector('.item')!;

// GOOD: Handle null case explicitly
const element = document.querySelector('.item');
if (!element) {
  throw new Error('Element not found');
}
// element is now non-null
```

## References

- [TypeScript Handbook - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript TSConfig Reference](https://www.typescriptlang.org/tsconfig/)
- [The Strictest TypeScript Config](https://whatislove.dev/articles/the-strictest-typescript-config/)
