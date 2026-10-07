# Architecture Documentation

This document provides a comprehensive overview of the `@sim-lu` TypeScript framework architecture, including package dependencies, execution pipelines, data flow, and component interaction maps.

---

## Table of Contents

1. [Package Architecture](#1-package-architecture)
2. [Dependency Graph](#2-dependency-graph)
3. [Application Bootstrap](#3-application-bootstrap)
4. [Dependency Injection](#4-dependency-injection)
5. [Routing](#5-routing)
6. [Execution Pipeline](#6-execution-pipeline)
7. [HTTP Request Flow](#7-http-request-flow)
8. [WebSocket Flow](#8-websocket-flow)
9. [Error Handling](#9-error-handling)
10. [Adapters](#10-adapters)
11. [Testing Strategy](#11-testing-strategy)
12. [Examples](#12-examples)

---

## 1. Package Architecture

The framework is organized as a monorepo with the following packages:

| Package                    | Responsibility                                  |
| -------------------------- | ----------------------------------------------- |
| `@sim-lu/common`           | Framework-independent decorators, metadata, types, interfaces |
| `@sim-lu/http`             | HTTP/WebSocket abstractions (transport-agnostic)  |
| `@sim-lu/core`             | Runtime orchestration: DI, modules, execution engine, routing |
| `@sim-lu/error`            | Error and response error semantics               |
| `@sim-lu/platform-express`  | Express.js HTTP adapter                          |
| `@sim-lu/platform-uws`     | uWebSockets.js HTTP adapter                      |
| `@sim-lu/database`         | Database abstractions and implementations        |

### Dependency Ordering

Conceptually, the layers stack as:

```text
@sim-lu/common
        ↓
@sim-lu/http
        ↓
@sim-lu/core
        ↓
platform adapters (express / uws)
```

`@sim-lu/error` and `@sim-lu/database` are horizontally-positioned packages that depend on `common`/`http` but are not part of the core runtime dependency chain. Platform adapters depend on both `core` and `error`.

### Package Dependency Rules (from AGENT.md section 1.2)

- Platform-specific dependencies (Express, uWS) **must not** leak into platform-independent packages
- `@sim-lu/error` owns error serialization; adapters must delegate to its utilities rather than reimplementing
- `@sim-lu/http` abstractions must not expose Express- or uWS-specific implementation details

---

## 2. Dependency Graph

```text
  ┌─────────────────────────────────────────────────────────────┐
  │                      @sim-lu/common                           │
  │  decorators · metadata · interfaces · types · correlation    │
  └──────────────────────┬──────────────────────────────────────┘
                         │
                         │ imports reflect-metadata
                         ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                      @sim-lu/http                             │
  │  HttpRequest · HttpResponse · WebSocketSocket · WebSocketCtx   │
  └──────────────────────┬──────────────────────────────────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
              ▼          ▼          ▼
  ┌─────────────┐ ┌────────────┐ ┌─────────────────┐
  │ @sim-lu/core │ │ @sim-lu/error │ │ @sim-lu/database    │
  │  DI · routes │ │  exceptions  │ │  adapter abstraction  │
  │  exec engine │ │  handlers    │ │  Memory · SQL        │
  │  adapters    │ │  serialization│ │                      │
  └──────┬──────┘ └──────┬───────┘ └─────────┬───────────┘
         │              │                   │
         │              │                   │
         ▼              ▼                   │
  ┌──────────────────────────────┐        │
  │  @sim-lu/platform-express      │        │
  │  ExpressAdapter (extends        │        │
  │  NodeHttpKernel)                │        │
  └──────────────────────────────┘        │
         │                                   │
         │ uses error + core                │
         ▼                                   │
  Express.js                     ┌─────────────────────────┐
                                 │  @sim-lu/platform-uws    │
                                 │  UwsAdapter (extends     │
                                 │  NodeHttpKernel)         │
                                 │                          │
                                 └─────────────────────────┘
                                   │
                                   ▼
                              uWebSockets.js
```

### Runtime Dependencies (package.json `dependencies`)

| Package                 | Runtime Dependencies                           |
| ----------------------- | --------------------------------------------- |
| `@sim-lu/common`        | `reflect-metadata`                             |
| `@sim-lu/http`          | _(none — pure TypeScript types)_               |
| `@sim-lu/core`          | `@sim-lu/common`, `@sim-lu/http`, `@sim-lu/error` |
| `@sim-lu/error`         | `_` (uses `@sim-lu/common` for re-exports)    |
| `@sim-lu/platform-express` | `@sim-lu/core`, `@sim-lu/error`, `express`   |
| `@sim-lu/platform-uws`  | `@sim-lu/core`, `@sim-lu/error`               |
| `@sim-lu/database`      | `_` (adapter pattern, no hard HTTP dependency) |

---

## 3. Application Bootstrap

### Flow Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                     ApplicationContext.create()                  │
│                        (factory.ts)                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ModuleCompiler.compile()                        │
│  - Walks @Module() imports                                      │
│  - Registers metadata in ModuleContainer                       │
│  - Detects circular module imports                            │
│  - Deduplicates modules                                         │
│  Returns: CompiledModules { root, modules }                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ContainerComposer.compose()                    │
│  - Visits modules in depth-first import order                   │
│  - Registers ModuleRef in each module container                 │
│  - Instantiates providers (singleton)                           │
│  - Instantiates controllers                                     │
│  - Registers decorator providers (guards, pipes, etc.)         │
│  - Copies exported providers to importing modules               │
│  - Detects circular provider dependencies                       │
│  - Registers controllers in ControllerRegistry                  │
│  Returns: ModuleWrapper[] (initOrder)                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  RouteRegistry.exploreModules()                 │
│  - Iterates each module's ControllerRegistry                    │
│  - RouteExplorer reads @Get/@Post/etc metadata                  │
│  - Creates HttpRouteDefinition[] and WebSocketRouteDefinition[]│
│  - Asserts no duplicate routes                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LifecycleExecutor.callOnModuleInit()           │
│  - Invokes onModuleInit() on all instances                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LifecycleExecutor.callOnApplicationBootstrap() │
│  - Invokes onApplicationBootstrap() on all instances            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Plugin registration                            │
│  - Invokes plugin.register() for each registered plugin         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │  ApplicationContext is ready
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  ApplicationContext.listen()                    │
│  1. resolveAdapter()                                           │
│  2. applyAdapterErrorHandler()                                 │
│     - Creates DefaultExceptionFilter with adapter's ErrorHandler│
│  3. bindAdapter()                                              │
│     - Creates RequestExecutor                                   │
│     - Registers HTTP routes via adapter.registerHttp()          │
│     - Registers WebSocket routes via adapter.registerWebSocket()│
│  4. adapter.listen()                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Key Classes

| Class                | File                                     | Role                                      |
| -------------------- | ---------------------------------------- | ----------------------------------------- |
| `ApplicationContext` | `core/src/application/application-context.ts` | Root context; owns compiler, composer, lifecycle, routes, dispatchers |
| `ModuleCompiler`     | `core/src/application/module-compiler.ts`     | Compiles module metadata into `ModuleWrapper` tree |
| `ContainerComposer`  | `core/src/application/container-composer.ts`  | Instantiates providers, wires DI containers, manages exports |
| `LifecycleExecutor`  | `core/src/application/lifecycle-executor.ts`  | Invokes lifecycle hooks (init, bootstrap, destroy, shutdown) |
| `GlobalEnhancers`    | `core/src/application/global-enhancers.ts`    | Stores globally-registered guards/interceptors/filters/pipes/transformers |
| `ModuleWrapper`      | `core/src/application/module-wrapper.ts`      | Runtime representation of a compiled module |

---

## 4. Dependency Injection

### Container Resolution

```text
┌─────────────────────────────────────────────────────────┐
│                    Container.resolve(token)              │
│                  (container.ts)                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Is ClassProvider?                                       │
│  → resolveClass()                                        │
│  - Reads constructor parameter metadata                  │
│  - Resolves each dependency recursively                  │
│  - Detects circular provider deps                        │
│  - new Constructor(...deps)                              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Is ValueProvider?                                       │
│  → return useValue                                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Is FactoryProvider?                                     │
│  → resolve inject deps                                  │
│  → factory.useFactory(...deps)                          │
│  → await result                                         │
│  → provider value                                       │
└─────────────────────────────────────────────────────────┘
```

### Provider Types

```typescript
// Class provider (default for @Injectable)
{ token: SomeToken, useClass: SomeClass }

// Value provider
{ token: SomeToken, useValue: someValue }

// Factory provider
{ token: SomeToken, useFactory: (...deps) => value, inject: [DepA, DepB] }
```

### Provider Resolution Semantics

1. **Class providers**: Constructor parameters are resolved via `getConstructorDependencies()` which reads `@Inject` metadata and constructor parameter names. Token resolution falls back to name-based matching via `matchTokenByParamName()`.

2. **Value providers**: Return `useValue` directly.

3. **Factory providers**: Inject dependencies are resolved (each via `Container.resolve()` which returns `Promise<T>`), then `factory.useFactory(...deps)` is called. The result is `await`ed if it is a Promise, ensuring async factory providers resolve to their actual value rather than a `Promise`.

### Known DI Issues

| Priority | Issue | File | Impact |
|----------|-------|------|--------|
| P1 | No request scope implementation | `InjectableMetadata.scope` type exists but runtime resolution is not implemented | Request-scoped providers cannot be resolved within request context |

---

## 5. Routing

### Route Discovery Flow

```text
┌─────────────────────────────────────────────────────────┐
│              RouteRegistry.exploreModules(modules)       │
│              (route-registry.ts)                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  For each module:                                       │
│    For each controller in module.controllerRegistry:    │
│      RouteExplorer.explore(controller)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
            ▼                     ▼
  ┌────────────────┐    ┌─────────────────────────────┐
  │ exploreHttp()  │    │ exploreWebSocket()           │
  │                │    │                             │
  │ - Reads @Controller│  │ - Reads @WebSocket()         │
  │ metadata        │    │ metadata                    │
  │ - Reads @Get/   │    │ - Reads @On()/@OnOpen/     │
  │   @Post/etc     │    │   @OnMessage/@OnClose       │
  │ metadata        │    │   metadata                  │
  │ - joinPaths()   │    │ - joinPaths()               │
  │ - HandlerRef()  │    │ - HandlerRef()              │
  │ Returns:        │    │ Returns:                    │
  │ HttpRouteDef[] │    │ WebSocketRouteDef[]        │
  └────────────────┘    └─────────────────────────────┘
                         │
                         ▼
  ┌─────────────────────────────────────────────────────────┐
  │  assertUniqueRoutes()                                   │
  │  - Duplicate HTTP:  method + path                        │
  │  - Duplicate WS:    path + event                         │
  └─────────────────────────────────────────────────────────┘
```

### HTTP Route Matching

Platform adapters register routes with their native router (Express `app.get()`, uWS `app.get()`). For native uWS routing, `request.getParams()` extracts path parameters.

The `NodeHttpKernel` provides a fallback matching layer:

```text
┌─────────────────────────────────────────────────────────┐
│              NodeHttpKernel.match(method, pathname)     │
│              (node-http-kernel.ts)                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  1. Exact match (route.path === pathname)               │
│     → return immediately                                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  2. Pattern match via matchPath(template, pathname)     │
│     - :param syntax → extract named params              │
│     - * wildcard → catch-all                             │
│     - pathSpecificity() scores routes for ranking       │
└─────────────────────────────────────────────────────────┘
```

### Route Specificity Scoring

| Segment Type | Score |
|-------------|-------|
| Static segment (`users`) | 100 |
| Parameter segment (`:id`) | 10 |
| Wildcard (`*`) | 1 |

Higher scores are more specific. Exact matches always win over pattern matches.

---

## 6. Execution Pipeline

### Component Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           ExecutionDispatcher                            │
│                          (execution-dispatcher.ts)                       │
│                                                                         │
│  Wraps ExecutionEngine inside an ExecutionPipeline                     │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ExecutionPipeline                               │
│                       (execution-pipeline.ts)                            │
│                                                                         │
│  Middleware-style chain (can be extended with .use())                  │
│  Default: no middleware registered                                     │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           ExecutionEngine                                │
│                       (execution-engine.ts)                             │
│                                                                         │
│  Orchestrates the full execution pipeline:                               │
│    1. InterceptorExecutor (wraps handler call)                          │
│    2. GuardExecutor (throws ForbiddenException on denial)              │
│    3. ExecutionRunner → ParameterResolver + ParameterPipeExecutor      │
│    4. Handler.invoke() (actual controller method)                       │
│  5. ExceptionFilterExecutor (catches thrown exceptions)              │
│    5a. If filter returns SerializedBody → skip pipes/transformers    │
│  6. PipeExecutor (route-level @UsePipes on result)                   │
│  7. TransformerExecutor (transforms result)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Actual Execution Order

```text
Incoming Request
    ↓
RequestExecutor.executeHttp() or executeWebSocket()
    ↓
ExecutionDispatcher.execute()
    ↓
ExecutionPipeline.execute()     ← middleware chain (default: passthrough)
    ↓
ExecutionEngine.execute()
    ├── try:
    │     InterceptorExecutor.execute()    ← wraps everything below
    │       ├── GuardExecutor.execute()    ← throws ForbiddenException(403) if denied
    │       ├── ExecutionRunner.execute()
    │       │     ├── ParameterResolver.resolve()    ← @Param, @Query, @Body, etc.
    │       │     ├── ParameterPipeExecutor.execute() ← per-parameter pipes
    │     │     └── HandlerRef.invoke()     ← actual controller method
    │     └── (interceptor after-hook)
    ├── catch (exception):
    │     ExceptionFilterExecutor.execute() ← @Catch / @UseFilters / DefaultExceptionFilter
    │
    ├── PipeExecutor.execute()              ← route-level @UsePipes on result
    └── TransformerExecutor.execute()       ← @UseTransformers on result
    ↓
Response
```

### Key Executor Components

| Executor             | File                              | Role                                         |
| -------------------- | --------------------------------- | -------------------------------------------- |
| `InterceptorExecutor` | `interceptor/interceptor-executor.ts` | Wraps handler in nested before/after chain |
| `GuardExecutor`      | `guard/guard-executor.ts`            | Runs `@UseGuards` before handler; throws `ForbiddenException` |
| `ExecutionRunner`    | `execution/execution-runner.ts`      | Orchestrates parameter resolution + handler invocation |
| `ParameterResolver`  | `parameter/parameter-resolver.ts`    | Resolves `@Param`, `@Query`, `@Body`, `@WsSocket`, etc. |
| `ParameterPipeExecutor` | `parameter/parameter-pipe-executor.ts` | Executes per-parameter pipes (before handler) |
| `PipeExecutor`       | `pipe/pipe-executor.ts`              | Executes route-level `@UsePipes` (after handler, on result) |
| `ExceptionFilterExecutor` | `exception-filter/exception-filter-executor.ts` | Catches exceptions, matches `@Catch` types |
| `TransformerExecutor` | `transform/transformer-executor.ts` | Transforms successful results |

### Important Semantics

#### Two Pipe Systems (AGENT.md section 9)

```text
┌──────────────────┐    METADATA_KEYS.PARAMETER_PIPES    ┌──────────────────────┐
│ @UsePipes on     │ ──────────────────────────────►   │ ParameterPipeExecutor │
│ @Param/@Query    │                                     │ Operates per-param    │
│ parameter        │                                     │ BEFORE handler        │
└──────────────────┘                                     └──────────────────────┘

┌──────────────────┐    METADATA_KEYS.PIPE (class/      ┌──────────────────┐
│ @UsePipes on     │ ──────────────►                    │ PipeExecutor      │
│ class or method  │  method-level                        │ Operates on      │
│                  │                                     │ handler RESULT   │
└──────────────────┘                                     │ AFTER handler    │
                                                           └──────────────────┘
```

**Do not confuse `METADATA_KEYS.PARAMETER_PIPES` with `METADATA_KEYS.PIPE`.**

#### Guard Denial Semantics (AGENT.md section 8)

```text
Guard returns false
    ↓
GuardExecutor throws ForbiddenException("Execution denied by guard")
    ↓
ExceptionFilterExecutor catches it
    ↓
DefaultExceptionFilter or @Catch(HttpException) handles → 403 response
```

#### Exception Filter Resolution

Filters are evaluated in reverse registration order (method-level → controller-level → global). The `@Catch()` decorator stores exception types; if no types are provided, the filter matches all exceptions (catch-all).

---

## 7. HTTP Request Flow

### Complete Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           HTTP Request                                  │
│  (Express request / uWS request or Node.js IncomingMessage)            │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Platform Adapter                              │
│              (express-adapter.ts / uws-adapter.ts)                      │
│                                                                         │
│  1. Extract/generate requestId + traceId                                │
│  2. Set x-request-id / x-trace-id response headers                      │
│  3. Create HttpRequest (normalize headers, params, query, body)         │
│  4. Create MutableHttpResponse                                         │
│  5. Call RequestExecutor.executeHttp(route, request, response)         │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       RequestExecutor.executeHttp()                     │
│                       (request-executor.ts)                             │
│                                                                         │
│  1. Create ExecutionContext with transport="http"                     │
│  2. Set context state: request, response, params, query, headers,     │
│     cookies, body                                                      │
│  3. Call ExecutionDispatcher.execute() → ExecutionEngine.execute()     │
│  4. Check result for SerializedBody → apply to response (setStatus,      │
│     set headers, send payload) — single authoritative write               │
│  5. If response.body undefined and result !== undefined → response.send()
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Execution Engine (see §6)                       │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Response Serialization                                                 │
│                                                                         │
│  Express:                                                             │
│    writeExpress() → serializeBody() → response.status() + headers + send│
│                                                                         │
│  uWS:                                                                 │
│    writeUws() → serializeBody() → response.writeStatus() + headers + end│
│                                                                         │
│  Error responses:                                                     │
│    Express: next(exception) → error middleware → handleAdapterError()   │
│    uWS:      try/catch → handleAdapterError()                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Status Code Propagation (AGENT.md section 13)

```text
Controller returns SuccessResponse/FailureResponse with statusCode
    ↓
RequestExecutor.executeHttp() reads result.statusCode
    ↓
response.setStatus(statusCode)   ← MutableHttpResponse
    ↓
Platform adapter reads writer.status
    ↓
Express:  response.status(writer.status)
uWS:      response.writeStatus(getStatusLine(writer.status))
    ↓
actual HTTP status code
```

**Do not hardcode `200` at the adapter layer.** The adapter reads the status from `MutableHttpResponse.status`.

### Response Types

```typescript
// SuccessResponse
interface SuccessResponse<T> {
    readonly success: true;
    readonly statusCode: number;   // 200, 201, 204, etc.
    readonly data: T;
    readonly meta?: Record<string, unknown>;
}

// FailureResponse
interface FailureResponse {
    readonly success: false;
    readonly statusCode: number;   // 400, 403, 404, 500, etc.
    readonly error: string;        // "Bad Request", "Not Found", etc.
    readonly message: string;
    readonly details?: unknown;
}

// Response helpers
ok(data)       → SuccessResponse, statusCode: 200
created(data)  → SuccessResponse, statusCode: 201
noContent()    → SuccessResponse, statusCode: 204, data: null
fail(code, msg, details?) → FailureResponse
```

---

## 8. WebSocket Flow

### WebSocket Dispatch Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           WebSocket Event                               │
│  (Express upgrade / uWS WebSocket / manual dispatch)                   │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Platform Adapter                              │
│                                                                         │
│  Express: app.ws(path, handler) — uses ws library                      │
│  uWS:     app.ws(path, { message, open, close handlers })             │
│           dispatchWebSocket() called by adapter                        │
│                                                                         │
│  State object contains:                                              │
│    - ws.socket: WebSocketSocket                                         │
│    - ws.message: string (message data)                                  │
│    - ws.params, ws.query, ws.headers, ws.cookies (optional transport)   │
│    - ws.state: Map (connection-specific state)                          │
└──────────────────────────┬───────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              NodeHttpKernel.dispatchWebSocket()                        │
│              (node-http-kernel.ts:131)                                 │
│                                                                         │
│  1. Look up handler by path from websocketHandlers map                 │
│  2. Look up route by path + event from websocketRoutes map             │
│  3. Call handler(route, state) → RequestExecutor.executeWebSocket()     │
└──────────────────────────┬───────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             RequestExecutor.executeWebSocket()                         │
│             (request-executor.ts:67)                                     │
│                                                                         │
│  1. Create ExecutionContext with transport="websocket"                │
│  2. Set all state entries from the state object                        │
│  3. Build WebSocketContext from state (ws.socket, ws.params,        │
│     ws.query, ws.headers, ws.cookies, ws.state) and set as            │
│     "ws.context" on the ExecutionContext                              │
│  4. Call ExecutionDispatcher.execute() → ExecutionEngine.execute()    │
└──────────────────────────┬───────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Execution Engine (see §6)                       │
│                                                                         │
│  Guards, interceptors, exception filters, transformers ALL apply       │
│  to WebSocket handlers (same as HTTP)                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### WebSocket Parameter Decorators

```text
┌─────────────────────────────────────────────────────────┐
│                    Parameter Resolution                 │
│                    (parameter-resolver.ts)             │
└──────────────────────┬──────────────────────────────────┘
                       │
    ┌──────────────────┴────────────────────┐
    │                                       │
    ▼                                       ▼
@WsSocket()                              @WsMessage()
  type: "ws-socket"                      type: "ws-message"
  → context.get("ws.socket")             → context.get("ws.message")

    ▼
@WsContext()
  type: "ws-context"
  → context.get("ws.context")
  → Populated by RequestExecutor.executeWebSocket()
  → Returns a WebSocketContext (socket, params, query,
    headers, cookies, state)
```

### WebSocket Event Mapping

| Decorator       | Event value |
| --------------- | ----------- |
| `@OnOpen()`     | `"$open"`   |
| `@OnMessage()`  | `"$message"`|
| `@OnClose()`    | `"$close"`  |
| `@On(event)`    | custom event name |

### WebSocket Guards/Interceptors/Filters

All framework cross-cutting concerns (guards, interceptors, exception filters, transformers, pipes) apply to WebSocket handlers identically to HTTP handlers, since both go through `ExecutionEngine.execute()`.

---

## 9. Error Handling

### Error Handling Flow for HTTP

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        Exception in Handler                             │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              ExecutionEngine.execute() catch block                     │
│                                                                         │
│  try: interceptor → guard → handler                                   │
│  catch: ExceptionFilterExecutor.execute()                              │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              ExceptionFilterExecutor.execute()                         │
│              (exception-filter-executor.ts)                            │
│                                                                         │
│  Iterate filters in reverse order of registration                      │
│  For each filter:                                                      │
│    - Check @Catch() types match the exception                         │
│    - If match: call filter.catch(exception, context) → return result   │
│                                                                         │
│  No matching filter found:                                            │
│  → If fallbackFilter (DefaultExceptionFilter): call it                  │
│    → DefaultExceptionFilter.catch():                                      │
│      1. Extract request snapshot from context.get("request")           │
│      2. ErrorHandler.handle() → SerializedBody (logs + normalizes)      │
│      3. Return SerializedBody directly (no response writing)            │
│  → If no fallback: re-throw exception                                   │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │
               ┌────────────┴────────────┐
               │                         │
               ▼                         ▼
      ┌─────────────────┐    ┌──────────────────────────┐
      │ Custom filter   │    │ DefaultExceptionFilter    │
      │ catches &       │    │ Returns SerializedBody   │
      │ returns result  │    │ (no direct response      │
      │                 │    │  writes)                 │
      └─────────────────┘    └──────────────────────────┘
               │                         │
               ▼                         ▼
      ┌─────────────────────────────────────────┐
      │  ExecutionEngine.execute()               │
      │  isSerializedBody(result)?              │
      │  YES → skip PipeExecutor +              │
      │        TransformerExecutor              │
      │  NO → normal flow (pipes + transformers)│
      └──────────────────┬──────────────────────┘
                         │
                         ▼
      ┌──────────────────────────────────────────────────┐
      │ RequestExecutor.executeHttp()                    │
      │                                                │
      │  isSerializedBody(result)?                     │
      │  YES → apply to MutableHttpResponse:           │
      │    response.setStatus(statusCode)               │
      │    response.set all headers                     │
      │    response.send(payload)                       │
      │  NO → send result as body                     │
      └──────────────────┬──────────────────────────────┘
                         │
                         ▼
      ┌──────────────────────────────────────────────────┐
      │ Platform Adapter Response Writer                 │
      │                                                │
      │  Express: writeExpress() / writeSerialized()     │
      │  uWS:     writeUws() / writeSerializedUws()      │
      │  Node:    write() / writeSerializedNode()        │
      └──────────────────────────────────────────────────┘
```

### Error Response Flow

There are two error paths:

**1. Controller-level exceptions (handled by DefaultExceptionFilter):**

```text
┌─────────────────────────────────────────────────────────┐
│                    Exception Caught                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│        DefaultExceptionFilter.catch()                   │
│        (default-filter.ts)                              │
│                                                         │
│  Extracts request snapshot from context.get("request")  │
│  → includes method, url, ip, userAgent, requestId,     │
│    traceId                                             │
│                                                         │
│  ErrorHandler.handle():                               │
│    1. normalizeError(exception)                       │
│       - HttpException → statusCode, error, message     │
│       - Error → 500 Internal Server Error              │
│       - Unknown → 500 Internal Server Error            │
│                                                         │
│    2. logNormalizedError() → structured logs           │
│       with requestId, traceId, platform, service        │
│                                                         │
│    3. toFailureResponse(exception, includeDetails)      │
│       → { success: false, statusCode, error,            │
│         message, details? }                             │
│                                                         │
│    4. Return SerializedBody {                           │
│       payload: JSON.stringify(body),                  │
│       statusCode,                                        │
│       headers: { content-type, ...exception.headers }  │
│    }                                                    │
│                                                         │
│  Returns SerializedBody directly (no response writes)  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  ExecutionEngine.execute()                              │
│  isSerializedBody(result)?                              │
│  YES → skip PipeExecutor + TransformerExecutor          │
│  NO → normal flow                                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  RequestExecutor.executeHttp()                          │
│  isSerializedBody(result)?                              │
│  YES → apply to MutableHttpResponse:                    │
│    response.setStatus(statusCode)                       │
│    response.set all headers                             │
│    response.send(payload)                               │
│  NO → send result as body                               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Platform Adapter                                       │
│  Express: writeExpress() / writeSerialized()            │
│  uWS:     writeUws() / writeSerializedUws()             │
│  Node:    write() / writeSerializedNode()                │
└─────────────────────────────────────────────────────────┘

**2. Adapter-level errors (unmatched routes, unhandled adapter errors):**

```text
┌─────────────────────────────────────────────────────────┐
│  Adapter catches error or 404 unmatched route         │
│                                                         │
│  Express: next(exception) → error middleware          │
│  uWS:     catch block in dispatchUws()                │
│  Node:    catch block in handle()                     │
│                                                         │
│  handleAdapterError(errorHandler, exception,          │
│    requestSnapshot) → SerializedBody                   │
│  → writeSerialized() / writeSerializedNode()           │
└─────────────────────────────────────────────────────────┘
```

### Error Types

```text
┌─────────────────────────────────────────────────────────┐
│                    normalizeError()                      │
│                    (response.ts)                         │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌─────────────────┐            ┌─────────────────┐
│ isHttpException │           │     Error       │
│   → 4xx/5xx     │            │   → 500         │
│   statusCode    │            │   InternalError │
│   from exception│            │   Server Error  │
└─────────────────┘            └─────────────────┘
        │                             │
        │                             │
        ▼                             ▼
┌─────────────────────────────────────────────────────────┐
│              Unknown (non-Error, non-Exception)           │
│              → 500 Internal Server Error                 │
└─────────────────────────────────────────────────────────┘
```

### Error Response Types

```text
HttpException (base class)
├── BadRequestException (400)
├── UnauthorizedException (401)
├── PaymentRequiredException (402)
├── ForbiddenException (403)        ← Guard denials use this
├── NotFoundException (404)
├── MethodNotAllowedException (405)
├── NotAcceptableException (406)
├── ConflictException (409)
├── GoneException (410)
├── PayloadTooLargeException (413)
├── UnsupportedMediaTypeException (415)
├── UnprocessableEntityException (422)
├── TooManyRequestsException (429)
├── InternalServerErrorException (500)
├── NotImplementedException (501)
├── BadGatewayException (502)
├── ServiceUnavailableException (503)
└── GatewayTimeoutException (504)
```

### Error Flow for 404 (No Matching Route)

**Express**: Falls through to `app.use((request, response) => ...)` at the end of `bindExpressRoutes()`, which calls `notFoundBody()` → `ErrorHandler.handle(new NotFoundException())`.

**uWS (native)**: Falls through to `app.any("/*", ...)` in `bindUwsRoutes()`, which calls `notFoundBody()`.

**uWS (Node.js fallback)**: `NodeHttpKernel.handle()` calls `notFoundBody()` → `writeSerializedNode()` → structured JSON 404. When uWS is unavailable, the uWS adapter's `handle()` override is still used, so error handling is consistent.

### Default Exception Filter and Response Ownership (resolved)

```text
┌──────────────────────────────────────────────────────────────┐
│  DefaultExceptionFilter.catch() (default-filter.ts)           │
│                                                              │
│  1. ErrorHandler.handle() → SerializedBody                   │
│  2. Returns SerializedBody directly (no response writing)     │
│                                                              │
│  SerializedBody flows back through ExecutionEngine.execute()   │
│  which detects isSerializedBody(result) and skips              │
│  PipeExecutor and TransformerExecutor — the result is          │
│  already finalized.                                            │
│                                                              │
│  SerializedBody reaches RequestExecutor.executeHttp(),        │
│  which applies it to MutableHttpResponse:                     │
│    response.setStatus(statusCode)                              │
│    response.set all headers from SerializedBody               │
│    response.send(payload) — single authoritative write        │
└──────────────────────────────────────────────────────────────┘
```

### Adapter Error Handling

**Express** (`express-adapter.ts:188-217`):
```text
app.use((exception, request, response, _next) => {
    // Generates requestId + traceId (may duplicate)
    // Calls handleAdapterError()
    // Calls writeSerialized()
})
```

**uWS** (`uws-adapter.ts:331-342` and `node-http-kernel.ts:201-207`):
- Native uWS: `catch` block → `handleAdapterError()` → `writeSerializedUws()` or `writeSerializedNode()`
- Node.js fallback: uses `handleAdapterError()` / `notFoundBody()` (consistent JSON)
- `NodeHttpKernel.handle()`: uses `handleAdapterError()` / `notFoundBody()` → `writeSerializedNode()` (consistent JSON)

### Dependency Injection Scope Semantics

#### Scope definitions

The framework recognizes three provider scopes, defined via the `@Injectable({ scope })` decorator or the `scope` field on a `CustomProvider`:

```typescript
export type ProviderScope = "singleton" | "request" | "transient";
```

**Singleton** (default, implemented):

```text
Application Bootstrap
       ↓
ContainerComposer.instantiate()
  instantiates all providers + controllers
  caches instance in module.instances
       ↓
  registers as useValue in Container
       ↓
  Exported tokens → same instance bound into importing modules
       ↓
At runtime: app.get(token) or @Inject(token)
  → Container.resolve(token) → useValue → same instance
```

A singleton provider has one instance per module container for the entire lifetime of the application. If the provider is exported from a module, all importing modules receive the **same** instance (the instance is created once in the exporting module's container and bound as a value provider in each importer). Global modules further ensure all non-global modules receive the same instance.

Lifetime: **application-wide** (for exported providers) or **module-container-wide** (for non-exported providers).

**Request** (declared, partially implemented):

A request-scoped provider should create a fresh instance for each incoming HTTP request or WebSocket connection. The instance lifecycle would be tied to the `ExecutionContext` or a request-specific child container.

```text
Request A → ExecutionContext → new instance A
Request B → ExecutionContext → new instance B
```

For WebSockets, scope lifetime is defined as **connection lifetime** — one instance per WebSocket connection, shared across all events/messages on that connection.

Request-scoped providers are instantiated once during bootstrap (for circular dependency detection and initial wiring), but are NOT registered as `useValue` in the container. Runtime `Container.resolve()` calls for request-scoped providers throw an error, indicating that a request-scoped child container is needed. Full per-request resolution is pending implementation of the `ExecutionContext`-based request container mechanism.

**Transient** (declared, implemented):

A transient provider should create a new instance on every resolution.

```text
resolve(token) → new instance #1
resolve(token) → new instance #2
inject(token)  → instance from bootstrap-time composition
```

Transient providers are instantiated once during bootstrap (for dependency injection into other providers), but are NOT registered as `useValue` in the container. Each `Container.resolve()` call for a transient provider creates a fresh instance. Note that when a transient provider is injected into a singleton at bootstrap time, the singleton holds the initial instance — subsequent runtime `resolve()` calls return new instances.

#### Current implementation status

| Scope      | `@Injectable({ scope })` | `CustomProvider.scope` | Implemented in ContainerComposer |
|------------|--------------------------|------------------------|-----------------------------------|
| singleton  | Yes (default)            | Yes                    | Yes — via `module.instances` cache + `useValue` re-registration |
| request    | Yes                      | Yes                    | Partial — cached at bootstrap but not re-registered; `Container.resolve()` throws at runtime |
| transient  | Yes                      | Yes                    | Yes — cached at bootstrap but not re-registered; `Container.resolve()` creates new instances each call |

#### Implementation notes

- Singleton behavior emerges from `ContainerComposer.instantiate()` caching in `module.instances` and then re-registering as `useValue` providers. Post-bootstrap `Container.resolve()` for value providers returns the cached singleton.

- The `Container` class now caches singleton instances at runtime via its own `instances` Map, ensuring that `Container.resolve()` for singleton class providers returns the same instance.

- `Container.resolve()` is scope-aware. For each provider, it reads `provider.scope` (for `CustomProvider`) or the `@Injectable` metadata on the target class. Singleton providers are cached; transient providers create fresh instances; request-scoped providers throw an error.

- `Container.resolve()` is called at runtime by registries (GuardRegistry, PipeRegistry, etc.) and by `ModuleRef.resolve()`.

- The `providerScope()` helper in `provider-utils.ts` centralizes scope resolution logic, reading both `CustomProvider.scope` and `@Injectable()` metadata.

- To fully implement request scope, a per-request child `Container` would need to be created for each `ExecutionContext`, with request-scoped providers resolved fresh per request.

---

## 10. Adapters

### Class Hierarchy

```text
                    HttpAdapter (interface)
                          ↑
                    NodeHttpKernel (abstract)
                          ↑
               ┌──────────┴──────────┐
               │                     │
         ExpressAdapter            UwsAdapter
```

### NodeHttpKernel Responsibilities

- `registerHttp(route, handler)`: Stores route + handler in `httpRoutes[]`
- `registerWebSocket(path, routes, handler)`: Stores in `websocketRoutes` map + `websocketHandlers` map
- `listen(options)`: Creates Node.js HTTP server, calls `handle()` per request
- `handle(incoming, outgoing)`: 
   - Matches route via `match()` (exact then pattern)
   - Sets `x-request-id` / `x-trace-id` on response
   - 404: calls `notFoundBody()` → `writeSerializedNode()` (structured JSON)
   - Calls handler(request, writer)
   - Catch: calls `handleAdapterError()` → `writeSerializedNode()` (structured JSON)
   - Success: serializes response via `write()`
- `writeSerializedNode(outgoing, body)`: Writes a `SerializedBody` to `ServerResponse`
- `write(outgoing, writer)`: Serializes `MutableHttpResponse` to `ServerResponse`
- `match(method, path)`: Route matching with specificity scoring
- `dispatchWebSocket(path, event, state)`: WebSocket route dispatch
- `handleRequest(request, response)`: Public wrapper for `handle()`

### ExpressAdapter Extensions

- `getInstance()`: Lazily creates Express app with JSON, URL-encoded, and text body parsers
- `listen()`: Binds Express routes, starts Express server
- `handleRequest()`: Delegates to Express app
- `bindExpressRoutes()`: Registers all HTTP routes with Express router, adds 404 + error middleware
- `toHttpRequest()`: Converts Express Request to `HttpRequest`
- `writeExpress()`: Serializes `MutableHttpResponse` to Express response

### UwsAdapter Extensions

- `listen()`: Loads uWS module, binds native uWS routes, starts uWS server (falls back to NodeHttpKernel if uWS unavailable)
- `handle()`: Overrides parent — uses `handleAdapterError`/`notFoundBody` for 404 and catch
- `bindUwsRoutes()`: Registers routes with native uWS methods, adds `app.any("/*")` for 404
- `dispatchUws()`: Handles request with requestId/traceId, body reading, error handling
- `toHttpRequest()`: Converts uWS request to `HttpRequest` using `request.getParams()` for path params
- `writeUws()` / `writeSerializedUws()`: Serializes responses to uWS format

### Key Differences: Express vs uWS

| Concern | Express | uWS |
|---------|---------|-----|
| Path params | Express native `:param` + Express extracts params | uWS native `request.getParams()` |
| Fallback | `NodeHttpKernel.handle()` with structured JSON errors | `handle()` override with structured errors |
| 404 handling | Express middleware | `app.any("/*")` |
| Error handling | Express error middleware (`next(exception)`) | try/catch in `dispatchUws()` |
| Body parsing | `express.json()`, `express.urlencoded()`, `express.text()` | Custom `response.onData()` reader |
| WebSocket | Not directly implemented (uWS-only for now) | Native `app.ws()` support |

---

## 11. Testing Strategy

The framework uses multiple levels of testing as defined in AGENT.md section 27:

### Unit Tests
- `packages/common/test/`: Decorator, metadata, lifecycle tests
- `packages/core/test/`: Execution engine, executor, container, pipe, guard, interceptor tests
- `packages/error/test/`: Exception, response, handler, default-filter tests
- `packages/http/test/`: HTTP context, websocket tests
- `packages/database/test/`: Database adapter tests
- `packages/platform-express/test/`: Express adapter tests
- `packages/platform-uws/test/`: uWS adapter tests

### Integration Tests
- `packages/core/test/integration/`: 
  - `concurrency.test.ts`: 100 concurrent requests
  - `di-lifecycle.test.ts`: DI and lifecycle integration
  - `error-logging.test.ts`: Error handling and logging
  - `execution-pipeline.test.ts`: Full pipeline ordering
  - `http-integration.test.ts`: HTTP E2E through adapters
  - `performance.test.ts`: Performance benchmarks
  - `security.test.ts`: Security edge cases
  - `websocket.test.ts`: WebSocket E2E tests

### Adapter Contract Tests
- `express-contracts.test.ts` and `uws-contracts.test.ts` run the same semantic tests against both adapters

### Current Test Baseline (AGENT.md section 28)

```text
632 tests passing
60 test files
typecheck passing
build passing
```

---

## 12. Examples

| Example | Description |
|---------|-------------|
| `examples/full/` | Full-featured: DI, guards, interceptors, pipes, transformers, filters, WebSockets, error handling, database, file logging |
| `examples/express-minimal/` | Minimal Express adapter with `@Param`, `@Query`, `@Body`, guards, error handling |
| `examples/uws-minimal/` | Minimal uWS adapter with WebSocket gateway support |
| `examples/env-config/` | Environment variable configuration with zod validation |
| `examples/testing/` | Integration testing patterns with `MemoryLogTarget` and `AdapterLogTarget` |
| `examples/http-kernel/` | Minimal HTTP kernel subclassing `NodeHttpKernel` |

---

## Appendix: File Reference Map

### `@sim-lu/common`
| File | Key Exports |
|------|-------------|
| `decorates/controller.ts` | `@Controller()` |
| `decorates/http.ts` | `@Get()`, `@Post()`, `@Put()`, `@Delete()`, `@Patch()`, `@Head()`, `@Options()`, `@Trace()`, `@Connect()`, `@Route()` |
| `decorates/http-params.ts` | `@Param()`, `@Query()`, `@Body()`, `@Headers()`, `@Cookies()`, `@Session()`, `@Request()`, `@Response()`, `@Ctx()`, `@ExecutionContext` |
| `decorates/websocket.ts` | `@WebSocket()` |
| `decorates/websocket-events.ts` | `@On()`, `@OnOpen()`, `@OnMessage()`, `@OnClose()` |
| `decorates/websocket-params.ts` | `@WsSocket()`, `@WsMessage()`, `@WsContext()` |
| `decorates/guard.ts` | `@UseGuards()` |
| `decorates/pipe.ts` | `@UsePipes()` — stores `METADATA_KEYS.PIPE` |
| `decorates/interceptor.ts` | `@UseInterceptors()` |
| `decorates/exception-filter.ts` | `@Catch()`, `@UseFilters()`, stores `METADATA_KEYS.CATCH` |
| `decorates/transform.ts` | `@UseTransformers()` |
| `decorates/injectable.ts` | `@Injectable()` |
| `decorates/inject.ts` | `@Inject()` |
| `decorates/modules.ts` | `@Module()`, `@Global()` |
| `metadata/keys.ts` | `METADATA_KEYS` constants |
| `metadata/types.ts` | `ParameterMetadata`, `ParameterType`, `RouteMetadata`, `CustomProvider`, etc. |
| `metadata/reflect.ts` | `Reflect` polyfill imports |
| `interfaces/lifecycle.ts` | `OnModuleInit`, `OnApplicationBootstrap`, `OnModuleDestroy`, `BeforeApplicationShutdown`, `OnApplicationShutdown` |
| `interfaces/methods.ts` | `HttpMethod` type |
| `correlation.ts` | `generateRequestId()`, `generateTraceId()`, `generateSpanId()`, `extractRequestId()`, `extractTraceId()` |

### `@sim-lu/http`
| File | Key Exports |
|------|-------------|
| `http/context.ts` | `HttpConnection` |
| `http/request.ts` | `HttpRequest` |
| `http/response.ts` | `HttpResponse` |
| `websocket/socket.ts` | `WebSocketSocket` |
| `websocket/context.ts` | `WebSocketContext` |
| `websocket/message.ts` | `WebSocketMessageContext` |

### `@sim-lu/core`
| File | Key Exports |
|------|-------------|
| `application/application-context.ts` | `ApplicationContext`, `createApplicationContext()` |
| `application/factory.ts` | `createApplication()` |
| `application/module-compiler.ts` | `ModuleCompiler`, `CompiledModules` |
| `application/container-composer.ts` | `ContainerComposer` |
| `application/module-wrapper.ts` | `ModuleWrapper` |
| `application/lifecycle-executor.ts` | `LifecycleExecutor` |
| `application/global-enhancers.ts` | `GlobalEnhancers` |
| `container/container.ts` | `Container` |
| `container/provider.ts` | `Provider`, `ClassProvider`, `ValueProvider`, `FactoryProvider` |
| `container/token.ts` | `InjectToken` |
| `module/module-container.ts` | `ModuleContainer`, `mergeModuleMetadata()` |
| `module/module-ref.ts` | `ModuleRef` |
| `controller/controller-ref.ts` | `ControllerRef` |
| `controller/controller-registry.ts` | `ControllerRegistry` |
| `router/route-registry.ts` | `RouteRegistry` |
| `router/route-explorer.ts` | `RouteExplorer` |
| `router/route-definition.ts` | `HttpRouteDefinition`, `WebSocketRouteDefinition`, `RouteDefinition` |
| `router/path.ts` | `matchPath()`, `pathSpecificity()`, `joinPaths()`, `splitPath()`, `PathParams` |
| `execution/execution-context.ts` | `ExecutionContext`, `ExecutionTransport` |
| `execution/execution-engine.ts` | `ExecutionEngine` |
| `execution/execution-dispatcher.ts` | `ExecutionDispatcher` |
| `execution/execution-pipeline.ts` | `ExecutionPipeline` |
| `execution/execution-runner.ts` | `ExecutionRunner` |
| `execution/handler-ref.ts` | `HandlerRef` |
| `execution/handler-resolve.ts` | `HandlerResolver` |
| `parameter/parameter-resolver.ts` | `ParameterResolver` |
| `parameter/parameter-metadata.ts` | `ParameterMetadataResolver` |
| `parameter/parameter-pipe-executor.ts` | `ParameterPipeExecutor` |
| `guard/guard-executor.ts` | `GuardExecutor` |
| `guard/guard-metadata.ts` | `GuardMetadata` |
| `guard/guard-registry.ts` | `GuardRegistry` |
| `interceptor/interceptor-executor.ts` | `InterceptorExecutor` |
| `interceptor/interceptor-metadata.ts` | `InterceptorMetadata` |
| `interceptor/interceptor-registry.ts` | `InterceptorRegistry` |
| `pipe/pipe-executor.ts` | `PipeExecutor` |
| `pipe/pipe-metadata.ts` | `PipeMetadata` |
| `pipe/pipe-registry.ts` | `PipeRegistry` |
| `pipe/pipe-context.ts` | `PipeContext` |
| `exception-filter/exception-filter-executor.ts` | `ExceptionFilterExecutor` |
| `exception-filter/exception-filter-metadata.ts` | `ExceptionFilterMetadata` |
| `exception-filter/exception-filter-registry.ts` | `ExceptionFilterRegistry` |
| `transform/transformer-executor.ts` | `TransformerExecutor` |
| `transform/transformer-metadata.ts` | `TransformerMetadata` |
| `transform/transformer-registry.ts` | `TransformerRegistry` |
| `adapter/http-adapter.ts` | `HttpAdapter`, `ListenOptions` |
| `adapter/http-response.ts` | `MutableHttpResponse` |
| `adapter/http-utils.ts` | `parseQuery()`, `parseCookies()`, `extractParamNames()`, `serializeBody()` |
| `adapter/node-http-kernel.ts` | `NodeHttpKernel` |
| `adapter/request-executor.ts` | `RequestExecutor` |
| `adapter/execution-factory.ts` | `createExecutionDispatcher()` |
| `adapter/plugin.ts` | `AdapterPlugin`, `CreateApplicationOptions` |

### `@sim-lu/error`
| File | Key Exports |
|------|-------------|
| `http-exception.ts` | `HttpException`, `BadRequestException`, ..., `GatewayTimeoutException`, `isHttpException()`, `isHttpStatusCode()` |
| `http-status.ts` | `HttpStatus`, `HTTP_STATUS_NAMES`, `getStatusName()`, `getStatusLine()` |
| `response.ts` | `ok()`, `created()`, `noContent()`, `fail()`, `normalizeError()`, `toErrorBody()`, `toFailureResponse()`, `SuccessResponse`, `FailureResponse`, `ApiResponse`, `RequestSnapshot`, `NormalizedError` |
| `handler.ts` | `ErrorHandler`, `SerializedBody`, `ErrorHandlerOptions`, `LoggerOptions` |
| `default-filter.ts` | `DefaultExceptionFilter`, `createDefaultExceptionFilter()`, `ExceptionCatchContext`, `DefaultExceptionFilterOptions` |
| `adapter.ts` | `WritableHttpResponse`, `snapshotRequest()`, `createPlatformErrorHandler()`, `resolveException()`, `handleAdapterError()`, `notFoundBody()`, `applySerializedBody()` |
| `logger.ts` | `createErrorLogger()`, `logNormalizedError()`, `MemoryLogTarget`, `ElasticLogTarget`, `StreamLogTarget`, `WebhookLogTarget`, `LogEntry`, `LoggerOptions` |
| `adapter-log-target.ts` | `AdapterLogTarget`, `createLogTarget()`, `LogSender`, `LogTargetConfig` |
| `json.ts` | `serializeJson()`, `createSafeReplacer()` |
| `morgan.ts` | `createMorganLogger()`, `MorganOptions` |
| `upload.ts` | `createMemoryUploadOptions()`, `createUploadMiddleware()`, `fromUploadError()`, `isMulterError()`, `UploadFile`, `UploadLimits` |

### `@sim-lu/platform-express`
| File | Key Exports |
|------|-------------|
| `express-adapter.ts` | `ExpressAdapter`, `ExpressAdapterOptions` |

### `@sim-lu/platform-uws`
| File | Key Exports |
|------|-------------|
| `uws-adapter.ts` | `UwsAdapter`, `UwsAdapterOptions` |

### `@sim-lu/database`
| File | Key Exports |
|------|-------------|
| `database.module.ts` | `DatabaseModule`, `createDatabaseAdapter()`, `resolveDatabaseOptions()` |
| `database.plugin.ts` | `DatabasePlugin` |
| `database.service.ts` | `DatabaseService` |
| `adapter/database-adapter.ts` | `DatabaseAdapter`, `DatabaseOperations`, `QueryResult`, `SqlValue`, `TransactionHandle` |
| `adapter/memory-adapter.ts` | `MemoryDatabaseAdapter` |
| `adapter/sql-adapter.ts` | `SqlDatabaseAdapter` |
| `config/options.ts` | `DatabaseModuleOptions` |
| `tokens.ts` | `DATABASE`, `DATABASE_OPTIONS` |
