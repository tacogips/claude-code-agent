# Project Layout Conventions

Modern TypeScript project structure following Clean Architecture principles with Bun workspace for monorepo management.

## Clean Architecture Overview

Clean Architecture organizes code into concentric layers with dependencies pointing inward:

```
+--------------------------------------------------+
|                 Infrastructure                    |
|  +--------------------------------------------+  |
|  |                  Adapter                   |  |
|  |  +--------------------------------------+  |  |
|  |  |             Application              |  |  |
|  |  |  +--------------------------------+  |  |  |
|  |  |  |            Domain              |  |  |  |
|  |  |  |   (Entities, Value Objects)    |  |  |  |
|  |  |  +--------------------------------+  |  |  |
|  |  |       (Use Cases, Ports)             |  |  |
|  |  +--------------------------------------+  |  |
|  |     (Repositories, Mappers, DTOs)          |  |
|  +--------------------------------------------+  |
|       (Server, Config, External Services)        |
+--------------------------------------------------+
```

**Dependency Rule**: Inner layers MUST NOT know about outer layers. Domain cannot import from Application, Application cannot import from Adapter, etc.

## Bun Workspace Layout (Clean Architecture)

This project uses Bun workspaces to organize Clean Architecture layers as separate packages:

```
project-root/
  package.json            # Workspace root
  bun.lockb
  tsconfig.json           # Base TypeScript config
  bunfig.toml             # Bun configuration

  packages/
    domain/               # INNERMOST: Core business logic
      package.json
      tsconfig.json
      src/
        index.ts          # Public exports
        entities/
          index.ts
          user.ts
          order.ts
        value-objects/
          index.ts
          email.ts
          money.ts
        errors.ts

    application/          # Use cases and ports
      package.json
      tsconfig.json
      src/
        index.ts
        usecases/
          index.ts
          create-user.ts
          create-user.test.ts
          get-user-by-id.ts
        ports/
          index.ts
          user-repository.ts
          order-repository.ts
        dto.ts

    adapter/              # Implementations of ports
      package.json
      tsconfig.json
      src/
        index.ts
        persistence/
          index.ts
          postgres/
            index.ts
            user-repository.ts
            user-repository.test.ts
          memory/
            index.ts
            user-repository.ts
        mappers/
          index.ts
          user-mapper.ts

    infrastructure/       # OUTERMOST: External concerns
      package.json
      tsconfig.json
      src/
        index.ts
        server/
          index.ts
          routes.ts
          handlers.ts
        config.ts
        cli.ts

  apps/                   # Application entry points
    api/
      package.json
      tsconfig.json
      src/
        index.ts          # Main entry point
    cli/
      package.json
      tsconfig.json
      src/
        index.ts

  tests/                  # Integration tests
    api.test.ts
```

## Workspace Configuration

### Root package.json

```json
{
  "name": "my-project",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "typecheck": "bun run --filter '*' typecheck",
    "test": "vitest run",
    "build": "bun run --filter '*' build"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/bun": "latest"
  }
}
```

### Domain Package package.json (Minimal Dependencies)

```json
{
  "name": "@myproject/domain",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### Application Package package.json

```json
{
  "name": "@myproject/application",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@myproject/domain": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### Adapter Package package.json

```json
{
  "name": "@myproject/adapter",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@myproject/domain": "workspace:*",
    "@myproject/application": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### Infrastructure Package package.json

```json
{
  "name": "@myproject/infrastructure",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@myproject/domain": "workspace:*",
    "@myproject/application": "workspace:*",
    "@myproject/adapter": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

## Layer Responsibilities

### Domain Layer (`packages/domain/`)

Pure business logic with zero external dependencies:
- Entities with business rules
- Value objects for type safety
- Domain-specific error types

```typescript
// packages/domain/src/entities/user.ts
import type { Email } from "../value-objects/email";
import { DomainError } from "../errors";

export interface UserId {
  readonly value: string;
  readonly __brand: "UserId";
}

export interface User {
  readonly id: UserId;
  readonly email: Email;
  readonly name: string;
}

export function createUser(email: Email, name: string): User {
  if (name.trim().length === 0) {
    throw new DomainError("User name cannot be empty");
  }
  return {
    id: { value: crypto.randomUUID(), __brand: "UserId" } as UserId,
    email,
    name: name.trim(),
  };
}
```

```typescript
// packages/domain/src/value-objects/email.ts
import { DomainError } from "../errors";

export interface Email {
  readonly value: string;
  readonly __brand: "Email";
}

export function parseEmail(value: string): Email {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    throw new DomainError(`Invalid email format: ${value}`);
  }
  return { value, __brand: "Email" } as Email;
}
```

### Application Layer (`packages/application/`)

Use case implementations and port definitions:

```typescript
// packages/application/src/ports/user-repository.ts
import type { User, UserId } from "@myproject/domain";

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
}
```

```typescript
// packages/application/src/usecases/create-user.ts
import { createUser, parseEmail } from "@myproject/domain";
import type { User } from "@myproject/domain";
import type { UserRepository } from "../ports/user-repository";

export interface CreateUserInput {
  email: string;
  name: string;
}

export interface CreateUserUseCase {
  execute(input: CreateUserInput): Promise<User>;
}

export function createCreateUserUseCase(
  userRepo: UserRepository
): CreateUserUseCase {
  return {
    async execute(input: CreateUserInput): Promise<User> {
      const email = parseEmail(input.email);
      const user = createUser(email, input.name);
      await userRepo.save(user);
      return user;
    },
  };
}
```

### Adapter Layer (`packages/adapter/`)

Concrete implementations of ports:

```typescript
// packages/adapter/src/persistence/postgres/user-repository.ts
import type { User, UserId } from "@myproject/domain";
import type { UserRepository } from "@myproject/application";
import { userMapper } from "../../mappers/user-mapper";
import type { Database } from "./database";

export function createPostgresUserRepository(db: Database): UserRepository {
  return {
    async findById(id: UserId): Promise<User | null> {
      const row = await db.query("SELECT * FROM users WHERE id = $1", [id.value]);
      return row ? userMapper.toEntity(row) : null;
    },

    async save(user: User): Promise<void> {
      const row = userMapper.toRow(user);
      await db.query(
        "INSERT INTO users (id, email, name) VALUES ($1, $2, $3)",
        [row.id, row.email, row.name]
      );
    },

    async delete(id: UserId): Promise<void> {
      await db.query("DELETE FROM users WHERE id = $1", [id.value]);
    },
  };
}
```

### Infrastructure Layer (`packages/infrastructure/`)

Server setup and external integrations:

```typescript
// packages/infrastructure/src/server/routes.ts
import { Hono } from "hono";
import { createCreateUserUseCase } from "@myproject/application";
import { createPostgresUserRepository } from "@myproject/adapter";
import type { Database } from "@myproject/adapter";

export function createRouter(db: Database) {
  const app = new Hono();

  const userRepo = createPostgresUserRepository(db);
  const createUser = createCreateUserUseCase(userRepo);

  app.post("/users", async (c) => {
    const body = await c.req.json();
    const user = await createUser.execute(body);
    return c.json(user, 201);
  });

  return app;
}
```

## File Naming Conventions

Use kebab-case for all files and directories:

```
packages/
  domain/
    src/
      entities/
        user.ts           # kebab-case
        order-item.ts
      value-objects/
        email.ts
        money-amount.ts
  application/
    src/
      usecases/
        create-user.ts
        create-user.test.ts   # Co-located tests
        get-user-by-id.ts
```

## Import Organization

### Use workspace package imports

```typescript
// In packages/application/src/usecases/create-user.ts

// Import from workspace packages
import { createUser, parseEmail } from "@myproject/domain";
import type { User } from "@myproject/domain";

// Relative imports within same package
import type { UserRepository } from "../ports/user-repository";
```

### tsconfig.json with paths

```json
// packages/application/tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "paths": {
      "@myproject/domain": ["../domain/src"],
      "@myproject/domain/*": ["../domain/src/*"]
    }
  },
  "include": ["src/**/*"]
}
```

## Testing Organization

### Unit Tests (Co-located)

```typescript
// packages/application/src/usecases/create-user.test.ts
import { describe, test, expect, mock } from "bun:test";
import { createCreateUserUseCase } from "./create-user";
import type { UserRepository } from "../ports/user-repository";

describe("CreateUserUseCase", () => {
  test("creates user with valid input", async () => {
    const mockRepo: UserRepository = {
      findById: mock(() => Promise.resolve(null)),
      save: mock(() => Promise.resolve()),
      delete: mock(() => Promise.resolve()),
    };

    const usecase = createCreateUserUseCase(mockRepo);
    const user = await usecase.execute({
      email: "test@example.com",
      name: "Alice",
    });

    expect(user.name).toBe("Alice");
    expect(mockRepo.save).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
// tests/api.test.ts
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createApp } from "@myproject/infrastructure";

describe("API Integration", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    app = await createApp({ database: "test" });
  });

  test("POST /users creates a user", async () => {
    const response = await app.request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", name: "Alice" }),
    });

    expect(response.status).toBe(201);
  });
});
```

## Anti-Patterns to Avoid

```typescript
// BAD: Domain imports from infrastructure
// packages/domain/src/entities/user.ts
import { db } from "@myproject/infrastructure";  // NEVER!

// GOOD: Domain has no external dependencies
// packages/domain/src/entities/user.ts
export interface User { ... }
```

```typescript
// BAD: Use case knows about HTTP
// packages/application/src/usecases/create-user.ts
import { Request, Response } from "hono";  // NEVER!

// GOOD: Use plain DTOs
export interface CreateUserInput {
  email: string;
  name: string;
}
```

```typescript
// BAD: Layer-first organization (old style)
src/
  controllers/
  services/
  repositories/

// GOOD: Clean Architecture with workspaces
packages/
  domain/
  application/
  adapter/
  infrastructure/
```

## Workspace Commands

```bash
# Install all dependencies
bun install

# Run typecheck across all packages
bun run typecheck

# Run tests in specific package
vitest run --project @myproject/application

# Run all tests
vitest run

# Build all packages
bun run build
```

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Practical Clean Architecture in TypeScript](https://dev.to/msc29/practical-clean-architecture-in-typescript-rust-python-3a6d)
- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
