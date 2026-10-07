# Dependency Injection Guide

This guide covers the dependency injection (DI) system in `@sim-lu/core`, including providers, modules, tokens, and resolution semantics.

---

## Table of Contents

1. [Concept](#concept)
2. [Providers](#providers)
3. [Injection Tokens](#injection-tokens)
4. [Module Scope](#module-scope)
5. [Provider Visibility](#provider-visibility)
6. [Circular Dependencies](#circular-dependencies)
7. [Custom Providers](#custom-providers)
8. [Known Limitations](#known-limitations)

---

## Concept

The DI system uses a hierarchical container model:

```text
┌─────────────────────────────────────────────────────────┐
│                 Root Module Container                    │
│                 (root module's Container)                │
└──────────┬──────────────────────────────────────────────┘
           │
┌──────────┴──────────┐
│                     │
│  Imported Module    │  ← Each module has its own Container
│  Container          │  ← Exports copy provider instances here
│                     │
└──────────┬──────────┘
           │
┌──────────┴──────────┐
│  Global Module       │  ← @Global() modules inject exports
│  Container           │    into all other modules' containers
│                     │
└─────────────────────┘
```

### Key Classes

| Class            | File                        | Role                                      |
| ---------------- | --------------------------- | ----------------------------------------- |
| `Container`      | `container/container.ts`     | Module-scoped provider registry + resolver |
| `ModuleWrapper`  | `application/module-wrapper.ts` | Runtime wrapper for a compiled module   |
| `ContainerComposer` | `application/container-composer.ts` | Composes modules, instantiates providers |
| `ModuleContainer` | `module/module-container.ts`  | Stores module metadata                 |
| `ModuleRef`      | `module/module-ref.ts`       | Runtime reference to a module's container |

---

## Providers

A provider is a value, class, or factory that can be injected into controllers or other providers.

### Class Providers

```typescript
import { Injectable, Module } from "@sim-lu/core";

@Injectable()
export class UserService {
    constructor(private readonly db: DatabaseService) {}
}

@Module({
    providers: [UserService, DatabaseService],
})
export class UserModule {}
```

### Value Providers

```typescript
const API_KEY = Symbol("API_KEY");

@Module({
    providers: [
        { token: API_KEY, useValue: "secret-key-123" },
    ],
    exports: [API_KEY],
})
export class ConfigModule {}
```

### Factory Providers

```typescript
@Module({
    providers: [
        {
            token: DATABASE_URL,
            useFactory: (config: ConfigService) => config.getDatabaseUrl(),
            inject: [ConfigService],
        },
    ],
})
export class DatabaseModule {}
```

### Async Factory Providers

Factory providers can be synchronous or asynchronous. If the factory returns a `Promise`, the container `await`s the result:

```typescript
{
    token: DB_CONNECTION,
    useFactory: async () => {
        return await connectToDatabase();  // Returns Promise<Connection>
    },
}
// Provider value is Connection, not Promise<Connection>
```

Both patterns work:

```typescript
// Synchronous
useFactory: () => value

// Asynchronous
useFactory: async () => value
```

---

## Injection Tokens

Tokens are how the DI container identifies providers. They can be:

1. **Class references** (functions): `@Inject(DatabaseService)`
2. **String tokens**: `@Inject("database-url")`
3. **Symbol tokens**: `@Inject(DATABASE)` where `DATABASE = Symbol("DATABASE")`

### Using Tokens

```typescript
// Define token
export const API_CONFIG = Symbol("API_CONFIG");

// Register
@Module({
    providers: [
        { token: API_CONFIG, useValue: { baseUrl: "https://api.example.com" } },
    ],
    exports: [API_CONFIG],
})
export class ApiConfigModule {}

// Inject
@Injectable()
export class ApiClient {
    constructor(
        @Inject(API_CONFIG) private readonly config: { baseUrl: string },
    ) {}
}
```

### Token Resolution

When a provider's constructor parameter doesn't have `@Inject()`, the container uses:

1. **Type metadata** (from `reflect-metadata`): `@sim-lu/common` reads design-time types via `getConstructorDependencies()`
2. **Parameter names**: If type metadata is unavailable, uses constructor parameter names via `getConstructorParamNames()` and matches against known tokens via `matchTokenByParamName()`

```text
Constructor parameter resolution:
@Inject(token) present? ── Yes ─→ use token
    │
    No
    ↓
Has type metadata? ── Yes ─→ use type as token
    │
    No
    ↓
Has parameter name? ── Yes ─→ match against known tokens
    │
    No
    ↓
Throw "Unable to resolve constructor parameter"
```

---

## Module Scope

Each module has its own `Container` instance. Providers registered in one module are not automatically available in another—they must be explicitly exported.

### Module Structure

```typescript
@Module({
    imports: [DatabaseModule],           // Import other modules
    providers: [UserService],            // Local providers (private by default)
    controllers: [UserController],       // Controllers
    exports: [UserService],              // Exported providers (visible to importers)
})
export class UserModule {}
```

### Import Resolution Order

Modules are visited in **depth-first import order** (dependencies before dependents):

```text
RootModule
├── CommonModule          ← visited first
│   └── ConfigModule      ← visited before CommonModule finishes
├── UserModule            ← visited after its imports
└── OrderModule
```

This ensures all dependencies are instantiated before the modules that need them.

---

## Provider Visibility

### Local vs Exported Providers

```typescript
@Module({
    providers: [
        DatabaseService,           // Local (private)
        UserService,             // Local (private)
        { token: SECRET, useValue: "secret" },  // Local (private)
    ],
    exports: [UserService],        // Only UserService is visible to importers
})
export class UserModule {}
```

If another module imports `UserModule`, only `UserService` will be available. `DatabaseService` and `SECRET` are module-private.

### Global Modules

`@Global()` modules automatically make all their exports available to every other module:

```typescript
@Global()
@Module({
    providers: [ConfigService],
    exports: [ConfigService],
})
export class ConfigModule {}

// ConfigService can now be injected anywhere without importing ConfigModule
```

### Re-Export

Modules can re-export imported modules:

```typescript
@Module({
    imports: [DatabaseModule],
    exports: [DatabaseModule],  // Re-export the entire module
})
export class SharedModule {}
```

When `SharedModule` is imported, all of `DatabaseModule`'s exports become available.

---

## Circular Dependencies

### Circular Module Dependencies

The `ModuleCompiler` detects circular imports at compile time:

```typescript
@Module({ imports: [BModule] })
export class AModule {}

@Module({ imports: [AModule] })
export class BModule {}

// Throws: "Circular module import detected: A"
```

### Circular Provider Dependencies

The `ContainerComposer` detects circular constructor dependencies:

```typescript
@Injectable()
export class AService {
    constructor(b: BService) {}  // A depends on B
}

@Injectable()
export class BService {
    constructor(a: AService) {}  // B depends on A → circular!
}

// Throws: 'Circular provider dependency detected: "AService"'
```

---

## Custom Providers

### Custom Provider Types

```typescript
// Class provider
const provider1: Provider = { token: TOKEN, useClass: MyClass };

// Value provider
const provider2: Provider = { token: TOKEN, useValue: someValue };

// Factory provider
const provider3: Provider = {
    token: TOKEN,
    useFactory: (...deps) => computedValue,
    inject: [DEP1, DEP2],
};
```

### Decorator Providers (Cross-Cutting)

The framework automatically discovers and instantiates providers referenced by decorators (`@UseGuards`, `@UseInterceptors`, `@UseFilters`, `@UsePipes`, `@UseTransformers`) that are not explicitly registered as providers:

```text
Controller with @UseGuards(MyGuard)
    ↓
ContainerComposer.collectDecoratorProviders()
    ↓
If MyGuard is not in any container:
    → register as { token: MyGuard, useClass: MyGuard }
    → instantiate as singleton
```

This means you don't need to manually register guard, interceptor, filter, pipe, or transformer classes—they are auto-discovered.

---

## Known Limitations

1. **No Request or Transient Scope**

   Although `InjectableMetadata.scope` supports `"request"` and `"transient"`, the container treats all providers as singletons (instantiated once per module). Per-request isolation is not currently implemented.

2. **No Property Injection**

   Only constructor injection is supported. There is no `@Inject()` property decorator or field injection mechanism.
