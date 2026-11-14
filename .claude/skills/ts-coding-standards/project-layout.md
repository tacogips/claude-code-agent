# Project Layout Conventions

Modern TypeScript project structure emphasizing clarity, maintainability, and scalability.

## Directory Structure

### Single Package (Recommended for this project)

```
project-root/
  src/
    index.ts              # Main entry point, exports public API
    lib.ts                # Core library code
    lib.test.ts           # Tests co-located with source
    types/
      index.ts            # Shared type definitions
    utils/
      index.ts            # Utility functions
  dist/                   # Compiled output (gitignored)
  package.json
  tsconfig.json
  bunfig.toml             # Bun-specific config (optional)
```

### Feature-First Organization (For larger projects)

```
project-root/
  src/
    features/
      auth/
        auth.service.ts
        auth.service.test.ts
        auth.types.ts
        auth.errors.ts
        index.ts          # Public exports for feature
      users/
        users.service.ts
        users.repository.ts
        users.types.ts
        index.ts
    shared/
      types/
        index.ts
      utils/
        result.ts
        validation.ts
        index.ts
      errors/
        base-error.ts
        index.ts
    index.ts              # Main entry point
```

### Key Principles

1. **Feature over layer** - Group by feature (auth, users), not layer (services, repositories)
2. **Co-located tests** - Keep `*.test.ts` next to source files
3. **Flat hierarchy** - Maximum 3 levels of nesting
4. **Explicit exports** - Each directory has `index.ts` with public API
5. **Shared is thin** - Only truly shared code goes in `shared/`

## File Naming Conventions

### Use kebab-case for files and directories

```
src/
  auth-service.ts         # kebab-case
  user-repository.ts
  api-client/
    http-client.ts
```

Why kebab-case:
- Avoids case-sensitivity issues across OS (Windows vs Linux/Mac)
- Consistent with npm package naming
- URL-friendly

### Suffixes indicate purpose

| Suffix | Purpose |
|--------|---------|
| `.ts` | Regular TypeScript source |
| `.test.ts` | Unit tests |
| `.spec.ts` | Integration/E2E tests |
| `.types.ts` | Type definitions only |
| `.d.ts` | Declaration files |

## Import Organization

### Use absolute imports with path aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/features/*": ["src/features/*"],
      "@/shared/*": ["src/shared/*"]
    }
  }
}
```

```typescript
// Instead of:
import { User } from '../../../shared/types';

// Use:
import { User } from '@/shared/types';
```

### Import order convention

```typescript
// 1. Node built-ins
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// 2. External packages
import { z } from 'zod';
import { Result, ok, err } from 'neverthrow';

// 3. Internal absolute imports
import { User } from '@/shared/types';
import { createLogger } from '@/shared/utils';

// 4. Relative imports (same feature/module)
import { validateEmail } from './validation';
import type { AuthConfig } from './auth.types';
```

## Module Exports

### Barrel exports (index.ts)

```typescript
// src/features/auth/index.ts
export { AuthService } from './auth.service';
export type { AuthConfig, AuthResult } from './auth.types';
// Do NOT export internal implementation details
```

### Re-export vs direct export

```typescript
// GOOD: Export only public API
export { createUser, updateUser } from './user.service';
export type { User, CreateUserInput } from './user.types';

// BAD: Export everything
export * from './user.service';      // Exposes internals
export * from './user.repository';   // Exposes implementation
```

### Type-only exports

```typescript
// Separate type exports for tree-shaking
export type { User, CreateUserInput } from './user.types';

// Or inline
export { type User, createUser } from './user';
```

## Type Organization

### Dedicated types file

```typescript
// src/features/users/users.types.ts

// Domain entities
export interface User {
  readonly id: UserId;
  readonly email: Email;
  name: string;
  createdAt: Date;
}

// Input types
export interface CreateUserInput {
  email: string;
  name: string;
}

// Output types
export interface UserSummary {
  id: string;
  name: string;
}

// Internal types (not exported from index.ts)
export interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
}
```

### Global types

```typescript
// src/shared/types/index.ts

// Branded types
export type Brand<T, B extends string> = T & { readonly __brand: B };
export type UserId = Brand<string, 'UserId'>;
export type Email = Brand<string, 'Email'>;

// Utility types
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Common interfaces
export interface Timestamped {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

## Configuration Files

### tsconfig.json structure

```json
{
  "compilerOptions": {
    // Output
    "outDir": "./dist",
    "rootDir": "./src",

    // Module
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",

    // Strict
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,

    // Paths
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Anti-Patterns to Avoid

```
// BAD: Layer-first organization
src/
  controllers/
    user-controller.ts
    auth-controller.ts
  services/
    user-service.ts
    auth-service.ts
  repositories/
    user-repository.ts
    auth-repository.ts

// BAD: Deep nesting
src/
  modules/
    core/
      domain/
        entities/
          user/
            user.entity.ts   // 5 levels deep!

// BAD: Inconsistent naming
src/
  UserService.ts      # PascalCase
  auth-service.ts     # kebab-case
  orderService.ts     # camelCase

// BAD: Mixed test locations
src/
  user.ts
tests/
  user.test.ts        # Tests far from source
```

## References

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [12 TypeScript Project Layouts That Age Well](https://medium.com/@sparknp1/12-typescript-project-layouts-that-age-well-3159c6510257)
- [React Folder Structure 2025](https://www.robinwieruch.de/react-folder-structure/)
