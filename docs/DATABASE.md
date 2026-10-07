# Database Guide

This guide covers the database abstraction system in `@sim-lu/database`, including configuration, adapters, transactions, and the provider module pattern.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Database Adapters](#database-adapters)
4. [Memory Adapter](#memory-adapter)
5. [SQL Adapter](#sql-adapter)
6. [Custom Adapters](#custom-adapters)
7. [Configuration](#configuration)
8. [Transactions](#transactions)
9. [Error Handling](#error-handling)

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Application                              │
│                                                              │
│  @Module({ imports: [DatabaseModule.forRoot(opts)] })        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    DatabaseModule                           │
│                    (database.module.ts)                     │
│                                                              │
│  forRoot(options)                                           │
│    → DynamicModule with:                                    │
│      - DATABASE_OPTIONS value provider                      │
│      - DATABASE factory provider                            │
│      - DatabaseService                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    DatabaseService                          │
│                    (database.service.ts)                    │
│                                                              │
│  Injectable service wrapping DatabaseAdapter                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    DatabaseAdapter                          │
│                    (adapter/database-adapter.ts)            │
│                                                              │
│  Interface implemented by:                                   │
│    ├── MemoryDatabaseAdapter                                │
│    └── SqlDatabaseAdapter                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install Dependencies

```bash
pnpm add @sim-lu/database
```

### 2. Import the Module

```typescript
import { Module } from "@sim-lu/core";
import { DatabaseModule } from "@sim-lu/database";

@Module({
    imports: [
        DatabaseModule.forRoot({
            driver: "memory",
        }),
    ],
})
export class AppModule {}
```

### 3. Use DatabaseService

```typescript
import { Injectable } from "@sim-lu/core";
import { DatabaseService } from "@sim-lu/database";

@Injectable()
export class TodoService {
    constructor(private readonly db: DatabaseService) {}

    async create(data: { title: string }): Promise<Record<string, unknown>> {
        return await this.db.insert("todos", data);
    }

    async findAll(): Promise<Record<string, unknown>[]> {
        return await this.db.find("todos");
    }

    async findById(id: string): Promise<Record<string, unknown> | undefined> {
        return await this.db.findOne("todos", { id });
    }

    async update(id: string, data: Partial<Record<string, unknown>>): Promise<number> {
        return await this.db.update("todos", { id }, data);
    }

    async remove(id: string): Promise<number> {
        return await this.db.remove("todos", { id });
    }
}
```

---

## Database Adapters

### DatabaseAdapter Interface

```typescript
export interface DatabaseAdapter {
    readonly name: string;
    readonly driver: string;

    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;

    query<T>(sql: string, params?: readonly SqlValue[]): Promise<QueryResult<T>>;
    execute(sql: string, params?: readonly SqlValue[]): Promise<number>;
    transaction<T>(work: (tx: TransactionHandle) => Promise<T>): Promise<T>;
}
```

### DatabaseOperations Interface

```typescript
export interface DatabaseOperations {
    insert<T extends Record<string, unknown>>(table: string, data: T): Promise<T>;
    find<T extends Record<string, unknown>>(table: string, where?: Partial<T>): Promise<T[]>;
    findOne<T extends Record<string, unknown>>(table: string, where: Partial<T>): Promise<T | undefined>;
    update<T extends Record<string, unknown>>(table: string, where: Partial<T>, data: Partial<T>): Promise<number>;
    remove<T extends Record<string, unknown>>(table: string, where: Partial<T>): Promise<number>;
}
```

---

## Memory Adapter

The `MemoryDatabaseAdapter` is an in-memory implementation for development and testing:

```typescript
import { DatabaseModule } from "@sim-lu/database";

@Module({
    imports: [
        DatabaseModule.forRoot({
            driver: "memory",
        }),
    ],
})
export class AppModule {}
```

### Features

- No external dependencies
- Data persists in memory during the process lifetime
- Supports full CRUD operations
- Supports basic `WHERE` matching via object comparison

### Limitations

- Data is lost on process restart
- No real SQL query support (simulated operations)
- Not suitable for production use

---

## SQL Adapter

The `SqlDatabaseAdapter` provides SQL database support using AnyDbType:

```typescript
import { DatabaseModule } from "@sim-lu/database";
import { Sql } from "anydriver";

const client = Sql.postgres("postgresql://user:pass@localhost/db");

@Module({
    imports: [
        DatabaseModule.forRoot({
            driver: "postgres",
            client,
        }),
    ],
})
export class AppModule {}
```

### Supported SQL Drivers

| Driver       | AnyDriver Package            |
| ------------ | ---------------------------- |
| PostgreSQL   | `anydriver/pg` (pg)          |
| MySQL        | `anydriver/mysql` (mysql2)   |
| SQLite       | `anydriver/better-sqlite3`   |

### Configuration

```typescript
interface DatabaseModuleOptions {
    driver?: "memory" | "postgres" | "mysql" | "sqlite";
    adapter?: DatabaseAdapter;
    client?: Sql;
    autoConnect?: boolean;
}
```

---

## Custom Adapters

You can implement a custom database adapter:

```typescript
import type {
    DatabaseAdapter,
    DatabaseOperations,
    QueryResult,
    SqlValue,
    TransactionHandle,
} from "@sim-lu/database";

export class MongoAdapter implements DatabaseAdapter {
    readonly name = "mongodb";
    readonly driver = "mongodb";

    async connect(): Promise<void> {
        // Connect to MongoDB
    }

    async disconnect(): Promise<void> {
        // Disconnect
    }

    isConnected(): boolean {
        // Return connection state
    }

    async query<T>(sql: string, params?: readonly SqlValue[]): Promise<QueryResult<T>> {
        // Implement or throw NotNotSupported
    }

    async execute(sql: string, params?: readonly SqlValue[]): Promise<number> {
        // Implement or throw
    }

    async transaction<T>(work: (tx: TransactionHandle) => Promise<T>): Promise<T> {
        // Implement transaction support
    }
}
```

Register with a custom adapter:

```typescript
DatabaseModule.forAdapter(new MongoAdapter(), {
    driver: "mongodb",
});
```

---

## Configuration

### Dependency Injection Tokens

```typescript
// Tokens for injecting configuration
export const DATABASE = Symbol("DATABASE");
export const DATABASE_OPTIONS = Symbol("DATABASE_OPTIONS");

// Usage
@Injectable()
export class MyService {
    constructor(
        @Inject(DATABASE) private readonly db: DatabaseAdapter,
        @Inject(DATABASE_OPTIONS) private readonly options: DatabaseModuleOptions,
    ) {}
}
```

### Module Registration

The `DatabaseModule` uses a factory pattern for provider creation:

```typescript
// database.module.ts
{
    token: DATABASE,
    useFactory: () => createDatabaseAdapter(resolved),
}
```

Factory providers are fully supported, including async factories. Since `createDatabaseAdapter()` is synchronous, no `await` is needed for the default provider. Custom async factories that return `Promise<T>` are resolved automatically to `T`.

---

## Transactions

### Using Transactions

```typescript
import { Inject, Injectable } from "@sim-lu/core";
import { DATABASE } from "@sim-lu/database";

@Injectable()
export class TransferService {
    constructor(
        @Inject(DATABASE) private readonly db: DatabaseAdapter,
    ) {}

    async transfer(from: string, to: string, amount: number): Promise<void> {
        await this.db.transaction(async (tx) => {
            // Debit from source
            await tx.query(
                "UPDATE accounts SET balance = balance - ? WHERE id = ?",
                [amount, from],
            );

            // Credit to destination
            await tx.query(
                "UPDATE accounts SET balance = balance + ? WHERE id = ?",
                [amount, to],
            );
        });
    }
}
```

### Transaction Safety

```text
transaction(work)
    ├── connect (if not connected)
    ├── begin transaction
    ├── await work(tx)
    ├── commit (if work succeeds)
    └── rollback (if work throws)
```

---

## Error Handling

Database errors propagate through the framework's standard error handling pipeline:

```text
DatabaseService method throws
    ↓
DatabaseAdapter throws
    ↓
Propagates through DI container
    ↓
Controller handler (if used in controller)
    ↓
ExceptionFilterExecutor catches
    ↓
@Catch(DATABASE_ERROR) or DefaultExceptionFilter
    ↓
ErrorHandler handles → SerializedBody
    ↓
Response
```

### Error Types

Common database errors:
- Connection failures → `InternalServerErrorException`
- Query syntax errors → `BadRequestException`
- Constraint violations → `ConflictException`

Use `@UseFilters()` to register custom database error filters:

```typescript
@Catch(DatabaseError)
export class DatabaseErrorFilter implements ExceptionFilter {
    catch(exception: DatabaseError, context: ExceptionCatchContext) {
        return fail(503, "Database unavailable", {
            details: exception.message,
        });
    }
}
```
