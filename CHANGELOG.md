# Changelog

## Unreleased

### Application / module bootstrap

Added the first application bootstrap subsystem. This covers application context, container composition, and the module initialization lifecycle.

### `@sim-lu/common`

- Added lifecycle interfaces in `packages/common/src/interfaces/lifecycle.ts`:
  - `OnModuleInit`
  - `OnApplicationBootstrap`
  - `OnModuleDestroy`
  - `BeforeApplicationShutdown`
  - `OnApplicationShutdown`
- Re-exported those interfaces from `packages/common/src/interfaces/index.ts`.

Providers and controllers can implement these hooks. Bootstrap calls them after modules are compiled and composed; it does not require decorators.

### HTTP parameter decorators

Added 9 HTTP parameter decorators in `@sim-lu/common/src/decorates/http-params.ts`:

- `@Param(name?)` — binds route path parameters (`/users/:id`)
- `@Query(name?)` — binds query string parameters
- `@Body()` — binds the parsed request body
- `@Headers(name)` — binds a specific request header
- `@Cookies(name?)` — binds cookie values
- `@Session(name?)` — binds session values
- `@Request()` — binds the raw HTTP request object
- `@Response()` — binds the raw HTTP response object
- `@Ctx()` / `@ExecutionContext` — binds the execution context

All decorators use `createHttpParameterDecorator()` which stores `ParameterMetadata` via `Reflect.defineMetadata`. Parameter resolution consumes metadata via `PARAMETER_PIPES` key in `ParameterPipeExecutor`.

### Request/trace correlation utilities

Added correlation utilities in `packages/common/src/correlation.ts`:

- `generateRequestId()` — generates a unique request ID using crypto-backed random bytes
- `generateTraceId()` — generates a unique trace ID for distributed tracing
- `generateSpanId()` — generates a random span ID
- `extractRequestId(headers)` — extracts request ID from `x-request-id` or `x-correlation-id` headers
- `extractTraceId(headers)` — extracts trace ID from `x-trace-id` headers

These utilities are re-exported from `@sim-lu/common/src/index.ts` and `@sim-lu/error/src/index.ts`.

### Logging infrastructure enhancements

- Added `requestId`, `traceId`, `platform`, and `service` fields to the `LogEntry` interface in `packages/error/src/logger.ts`
- Updated `logNormalizedError` to pass `requestId` and `traceId` from the request snapshot to the logger
- Updated `formatConsoleLine` to display request ID prefix (first 8 chars) in console output
- Updated `toLogEntry` to extract `requestId`, `traceId`, `platform`, and `service` from log info
- Added `requestId` and `traceId` fields to the `RequestSnapshot` interface in `packages/error/src/response.ts`
- Added `requestId` and `traceId` optional fields to the `HttpRequest` interface in `packages/http/src/http/request.ts`

### `@sim-lu/core`

#### Module reference

- `ModuleRef` now exposes `get()` as an alias of `resolve()`, so application code can read providers from a selected module with the same API as `ApplicationContext.get()`.

#### Application module

New files under `packages/core/src/application/`:

- `module-wrapper.ts`
  - Runtime wrapper for one compiled `@Module()`.
  - Owns a module-scoped `Container`, a `ModuleRef`, imported wrappers, instantiated providers/controllers, and a `ControllerRegistry`.
- `module-compiler.ts`
  - Walks `imports` from the root module.
  - Registers each module in the existing `ModuleContainer`.
  - Detects circular module imports.
  - Deduplicates a module that is imported from more than one parent.
- `container-composer.ts`
  - Initializes modules in depth-first import order (dependencies before importers).
  - Registers local providers and controllers into the module container.
  - Registers the module's `ModuleRef` so it can be injected.
  - Copies exported provider instances into importing modules.
  - Supports re-exporting an imported module via `exports: [SomeModule]`.
  - Instantiates local providers/controllers once (singleton) and rebinds them as value providers.
  - Detects circular provider constructor dependencies.
  - Rejects exports that are not local providers/controllers or imported modules.
  - Registers controllers on the module `ControllerRegistry`.
- `lifecycle-executor.ts`
  - Invokes optional lifecycle methods on instantiated providers and controllers.
  - Init/bootstrap run in import order.
  - Destroy/shutdown run in reverse order.
- `application-context.ts`
  - `ApplicationContext.create(rootModule)` / `createApplicationContext(rootModule)` compile, compose, then call `onModuleInit` and `onApplicationBootstrap`.
  - `init()` is idempotent.
  - `get(token)` resolves from the root module first, then other compiled modules.
  - `select(module)` returns that module's `ModuleRef`.
  - `close(signal?)` runs `beforeApplicationShutdown`, `onModuleDestroy`, and `onApplicationShutdown`.
  - `close()` is a no-op before init and after the first close.
- `index.ts` re-exports the bootstrap types.
- `packages/core/src/index.ts` now exports the application module.

#### Container

- `Container` manages provider registration and resolution within a module scope
- `Provider` and `CustomProvider` types define dependency injection configuration
- `ProviderToken` supports string or symbol-based lookup keys
- Automatic circular dependency detection for provider constructors

#### Router

- `route-registry.ts` collects discovered routes from controllers or compiled modules
  - Exposes `getAll()`, `getHttpRoutes()`, `getWebSocketRoutes()`, and exact `matchHttp(method, path)`
  - Throws on duplicate HTTP method+path or WebSocket path+event combinations
- `route-explorer.ts` reads `@Controller()`, `@Get()`/`@Post()`/…, `@WebSocket()`, and `@On()`/`@OnMessage()` metadata
- `path.ts` provides `joinPaths()` for concatenating controller prefixes and method paths

`ApplicationContext.init()` now explores every compiled module's `ControllerRegistry` after composition and before lifecycle hooks.

- `getRouteRegistry()` returns the collected registry.
- `getRoutes()`, `getHttpRoutes()`, `getWebSocketRoutes()` expose discovered definitions.

`packages/core/src/index.ts` now exports the router module.

#### Execution engine

- `execution-context.ts` provides runtime context for handler invocation
- `execution-pipeline.ts` chains execution through the handler resolution pipeline
- `execution-dispatcher.ts` routes incoming requests to the appropriate handler
- `execution-runner.ts` orchestrates the execution flow: `execute` → `parameterResolver.resolve()` → `parameterPipeExecutor.execute()` → `handler.invoke(args)`
- `handler-ref.ts` and `handler-resolve.ts` manage handler references and resolution

#### Parameter resolution

- `parameter-metadata.ts` stores and retrieves `ParameterMetadata` with handler filtering by `parameter.handler === handler.method`
- `parameter-resolver.ts` resolves method parameters based on metadata types (param, query, body, header, cookie, session, request, response, context)
- `parameter-pipe-executor.ts` consumes `METADATA_KEYS.PARAMETER_PIPES` per-parameter pipes

#### Pipes

- `pipe.ts`, `pipe-context.ts`, `pipe-executor.ts`, `pipe-metadata.ts`, `pipe-registry.ts`
- `ParameterPipeExecutor` (`parameter/parameter-pipe-executor.ts`) consumes `METADATA_KEYS.PARAMETER_PIPES` for per-parameter validation/transformation
- `PipeExecutor` (`pipe/pipe-executor.ts`) executes route-level `@UsePipes` on handler return values (output transformation)
- `UsePipes` decorator registers pipe metadata in `METADATA_KEYS.PIPE` (class/handler level) and `METADATA_KEYS.PARAMETER_PIPES` (parameter level)

#### Interceptors

- `interceptor.ts`, `intercepto-context.ts`, `interceptor-executor.ts`, `interceptor-metadata.ts`, `interceptor-registry.ts`
- `UseInterceptors` decorator registers interceptors on controllers and handlers
- Interceptors wrap handler execution for cross-cutting concerns

#### Guards

- `guard.ts`, `guard-context.ts`, `guard-executor.ts`, `guard-metadata.ts`, `guard-registry.ts`
- `UseGuards` decorator registers guards for authorization checks
- Guards run before handler invocation, can short-circuit execution

#### Exception filters

- `exception-filter.ts`, `exception-filter-context.ts`, `exception-filter-executor.ts`, `exception-filter-metadata.ts`, `exception-filter-registry.ts`
- `Catch()` decorator marks exception filter classes
- `UseFilters` decorator registers filters on controllers and handlers
- `DefaultExceptionFilter` handles unmatched routes and unhandled exceptions; returns `SerializedBody` (no direct response writes)

#### Node fallback error consistency (Phase 4)

- `NodeHttpKernel.handle()` now uses structured JSON errors via `notFoundBody()` and `handleAdapterError()` instead of plain text
- `NodeHttpKernel.toRequest()` now includes `requestId` and `traceId` in the `HttpRequest`, ensuring `DefaultExceptionFilter` can log correlation IDs
- `NodeHttpKernel` constructor now accepts `(platform, options: ErrorHandlerOptions)` parameters
- `NodeHttpKernel` now exposes `getErrorHandler()` method, used by `ApplicationContext.applyAdapterErrorHandler()` to wire the adapter's error handler into the `DefaultExceptionFilter`
- `ExpressAdapter` and `UwsAdapter` constructors now delegate to `super(platform, options.error)` instead of creating their own error handlers
- Removed duplicate `getErrorHandler()` and unused `createPlatformErrorHandler` imports from Express and uWS adapters
- `DefaultExceptionFilter.snapshot()` now extracts `requestId` and `traceId` from the request, enabling correlation ID propagation to log entries

#### WebSocket context (Phase 5)

- `RequestExecutor.executeWebSocket()` now builds a `WebSocketContext` from state entries (`ws.socket`, `ws.params`, `ws.query`, `ws.headers`, `ws.cookies`, `ws.state`) and sets it as `"ws.context"` on the `ExecutionContext`, so `@WsContext()` returns a populated context instead of `undefined`

#### Shared error contract tests (Phase 6)

- Added `test/helpers/http-error-contract.ts` with `describeHttpErrorContract()` reusable test helper covering 11 shared tests (404, 400, 404, 409, 500, response headers, request trace ID, correlation IDs in logs) across Express, uWS, and Node fallback platforms

#### Response ownership (Phase 3)
- `request-executor.ts`: `RequestExecutor.executeHttp()` now detects `isSerializedBody(result)` and applies `statusCode`, `headers`, and `payload` to `MutableHttpResponse` as the single authoritative write path
- `execution-engine.ts`: `ExecutionEngine.execute()` now skips `PipeExecutor` and `TransformerExecutor` when the result is a `SerializedBody`, since error responses are already finalized

#### DI scope design (Phase 7)
- Added `ProviderScope` type (`"singleton" | "request" | "transient"`) to `@sim-lu/common` metadata
- Added `scope?: ProviderScope` field to `CustomProvider` interface, allowing custom providers to specify their scope
- Made `InjectableMetadata.scope` use the `ProviderScope` type for consistency
- Exported `ProviderScope` from both `@sim-lu/common` and `@sim-lu/core`
- Documented DI scope semantics in `docs/ARCHITECTURE.md` §10.1:
  - **Singleton**: one instance per module container for application lifetime; implemented via `ContainerComposer.instantiate()` caching in `module.instances` and re-registering as `useValue` providers
  - **Request**: (declared, not implemented) fresh instance per HTTP request/WebSocket connection, tied to `ExecutionContext`
  - **Transient**: (declared, not implemented) new instance per resolution; `Container.resolve()` does not cache

#### Transformers

- `transform.ts`, `transformer-context.ts`, `transformer-executor.ts`, `transformer-metadata.ts`, `transformer-registry.ts`
- `UseTransformers` decorator registers response transformers
- Transformers modify handler return values before serialization

#### Controller registry

- `controller-ref.ts` and `controller-registry.ts` manage controller registration and lookup
- Controllers are registered per-module during container composition

#### Adapter system

- `http-adapter.ts` defines the `HttpAdapter` interface
- `http-response.ts` handles HTTP response serialization
- `http-utils.ts` provides utility functions for HTTP operations
- `execution-factory.ts` creates execution contexts from adapter data
- `node-http-kernel.ts` manages the Node.js HTTP server layer
- `writeSerializedNode()` writes `SerializedBody` to `ServerResponse` (reused by uWS adapter)
- `errorHandler` creates a platform error handler for structured JSON responses
- `plugin.ts` defines the `AdapterPlugin` interface for extensibility
- `request-executor.ts` executes requests through the handler chain

### `@sim-lu/platform-express`

- Exports `ExpressAdapter` implementing the `HttpAdapter` interface
- Supports request ID and trace ID generation from `x-request-id` / `x-trace-id` headers
- Sets `x-request-id` and `x-trace-id` response headers on all responses
- `createApplication(rootModule, adapter)` requires an adapter instance
- `ApplicationContext.listen(adapter, options)` accepts an adapter at listen time
- `ApplicationContext.listen(options)` reuses the adapter from `create`/`createApplication`
- Listening without an adapter throws with guidance to choose Express or uWS

### `@sim-lu/platform-uws`

- Exports `UwsAdapter` implementing the `HttpAdapter` interface
- Supports request ID and trace ID generation from `x-request-id` / `x-trace-id` headers
- Sets `x-request-id` and `x-trace-id` response headers on all responses
- Full uWebSockets.js integration with WebSocket support via `@WebSocket()` gateway decorators
- `createApplication(rootModule, adapter)` and `ApplicationContext.listen(adapter, options)` patterns

### `@sim-lu/http`

- Exports HTTP context types: `HttpConnection`, `HttpRequest`, `CookieOptions`, `HttpResponse`, `ExecutionType`
- Exports WebSocket context types: `WebSocketSocket`, `WebSocketContext`, `WebSocketMessageContext`

### `@sim-lu/database`

- `DatabaseService` — injectable service wrapping database operations
- `DatabaseModule` — module providing database adapter configuration
- `DatabasePlugin` — application plugin for database lifecycle integration
- `MemoryDatabaseAdapter` — in-memory implementation for development/testing
- `SqlDatabaseAdapter` — SQL database adapter supporting PostgreSQL, MySQL, SQLite
- `DatabaseAdapter`, `DatabaseOperations` interfaces for custom adapter implementation
- `DATABASE` and `DATABASE_OPTIONS` injection tokens
- `createDatabaseAdapter()`, `resolveDatabaseOptions()` factory functions
- `QueryResult`, `SqlValue`, `TransactionHandle` types

### `@sim-lu/error`

- `HttpException` base class with `statusCode` and `message` properties
- Pre-built exception classes: `BadRequestException`, `UnauthorizedException`, `PaymentRequiredException`, `ForbiddenException`, `NotFoundException`, `MethodNotAllowedException`, `NotAcceptableException`, `ConflictException`, `GoneException`, `PayloadTooLargeException`, `UnsupportedMediaTypeException`, `UnprocessableEntityException`, `TooManyRequestsException`, `InternalServerErrorException`, `NotImplementedException`, `BadGatewayException`, `ServiceUnavailableException`, `GatewayTimeoutException`
- `ok()`, `created()`, `noContent()` — success response builders
- `fail(statusCode, message)` — failure response builder returning `FailureResponse`
- `normalizeError()` — normalizes any thrown value into a `NormalizedError`
- `toErrorBody()`, `toFailureResponse()` — error response serializers
- `getStatusName()`, `getStatusLine()` — HTTP status utilities with full status code mapping
- `createErrorLogger(options)` — creates a Winston-based logger with configurable targets
- `MemoryLogTarget`, `ElasticLogTarget`, `StreamLogTarget`, `WebhookLogTarget` — external log targets
- `AdapterLogTarget`, `createLogTarget()` — adapter-style log targets with configurable transformers
- `logNormalizedError()` — logs normalized errors with structured context
- `ErrorHandler` class with `handle()` and `notFound()` methods producing `SerializedBody`
- `DefaultExceptionFilter` — catch-all exception filter for unhandled errors
- `isSerializedBody()` type guard — detects `SerializedBody` results from exception filters
- `DefaultExceptionFilter.catch()` now returns `SerializedBody` instead of writing to the response and returning `FailureResponse`
- `createMorganLogger()` — HTTP request logging middleware integration
- `createMemoryUploadOptions()`, `createUploadMiddleware()`, `fromUploadError()`, `isMulterError()` — multipart file upload support
- `snapshotRequest()` — extracts request context for error correlation
- `createPlatformErrorHandler()` — platform-level error handler adapter
- `resolveException()`, `handleAdapterError()` — exception resolution utilities
- `serializeJson()` — safe JSON serialization with circular reference handling
- `createSafeReplacer()` — circular reference replacer for JSON.stringify
- Correlation utilities re-exported from `@sim-lu/common`

### `@sim-lu/common`

#### Dependency injection decorators

- `@Injectable()` — marks a class as an injectable provider
- `@Inject(token)` — explicit injection token for constructor parameters
- `@Module()` — groups providers, controllers, and imports into modules
- `@Global()` — marks a module as globally available for import

#### Controller and route decorators

- `@Controller(path?)` — marks a class as a controller with optional base path
- `@Get(path?)`, `@Post(path?)`, `@Put(path?)`, `@Delete(path?)`, `@Patch(path?)`, `@Head(path?)`, `@Options(path?)`, `@Trace(path?)`, `@Connect(path?)` — HTTP method route decorators
- `@Route(method, path)` — generic HTTP route decorator
- `@WebSocket(path)` — marks a class as a WebSocket gateway

#### Cross-cutting decorators

- `@UseGuards()` — registers guard implementations
- `@UseFilters()` — registers exception filter implementations
- `@UseInterceptors()` — registers interceptor implementations
- `@UsePipes()` — registers pipe implementations
- `@UseTransformers()` — registers transformer implementations
- `@Catch()` — marks a class as an exception filter

#### WebSocket event decorators

- `@On(event)` — WebSocket event handler registration
- `@OnOpen()`, `@OnMessage()`, `@OnClose()` — WebSocket lifecycle decorators

#### WebSocket parameter decorators

- `@WsSocket()` — binds the WebSocket socket
- `@WsMessage()` — binds the WebSocket message
- `@WsContext()` — binds the WebSocket context

#### Metadata system

- `METADATA_KEYS` — constants for all metadata keys used throughout the framework
- `Reflect` utility functions for metadata manipulation
- `ParameterMetadata`, `ParameterType` types for parameter reflection
- `ModuleMetadata`, `DynamicModule`, `CustomProvider`, `ModuleProvider`, `ProviderToken`, `InjectableMetadata` types

### Platform adapters

The HTTP server is no longer implicit. Applications must choose Express or uWebSockets.js.

- `@sim-lu/platform-express` exports `ExpressAdapter`.
- `@sim-lu/platform-uws` exports `UwsAdapter`.
- `createApplication(rootModule, adapter)` requires one of those adapters.
- `ApplicationContext.listen(adapter, options)` still accepts an adapter at listen time.
- `ApplicationContext.listen(options)` reuses the adapter passed to `create` / `createApplication`.
- Listening without an adapter throws and tells the caller to choose Express or uWS.

### Production readiness

- Root `package.json` has `build`, `typecheck`, and `test` scripts that run common, http, then core in order.
- Package `files` fields now publish only `dist`.
- Route accessors on `ApplicationContext` throw if the context has not been initialized.
- `reflect-metadata` added to root devDependencies for decorator metadata support.
- All packages compile with TypeScript, respecting `verbatimModuleSyntax` and `exactOptionalPropertyTypes`.

### Examples

- `examples/full/` — full-featured example with DI, guards, interceptors, pipes, transformers, filters, WebSockets, error handling, database integration, and file logging
- `examples/express-minimal/` — minimal Express adapter example
- `examples/uws-minimal/` — minimal uWebSockets.js adapter example
- `examples/env-config/` — environment variable configuration with zod validation
- `examples/testing/` — testing patterns with `MemoryLogTarget` and `AdapterLogTarget`

### Tests

- Added `packages/core/test/application-context.test.ts` covering:
  - context creation and idempotent `init()`
  - provider/controller registration and constructor injection
  - `ModuleRef` injection
  - `select()` / unknown module errors
  - import graph order and shared imported modules
  - exported vs private providers
  - module re-exports
  - invalid exports
  - circular module imports
  - lifecycle hook order, async hooks, shutdown signals, and missing hooks
- Added `packages/core/test/route-discovery.test.ts` covering:
  - path joining
  - HTTP prefix + method path composition
  - empty controllers
  - WebSocket gateway events and controller-path fallback
  - registry matching
  - application-level discovery across imported modules
  - idempotent `init()` (no duplicate routes)
  - pre-init route access errors
  - duplicate HTTP route detection
- Added tests for HTTP parameter decorators, correlation utilities, and request ID/trace ID logging

### Execution engine integration

The `ExecutionEngine` (`packages/core/src/execution/execution-engine.ts`) now fully integrates the complete execution pipeline:

- **Interceptors**: `InterceptorExecutor` wraps handler execution, allowing cross-cutting concerns to modify request/response
- **Guards**: `GuardExecutor` runs before handler invocation; throws if execution is denied
- **Exception filters**: `ExceptionFilterExecutor` catches exceptions and converts them to `SerializedBody` responses
- **Transformers**: `TransformerExecutor` transforms handler return values after execution
- **Pipes**: `ParameterPipeExecutor` consumes `METADATA_KEYS.PARAMETER_PIPES` for per-parameter validation/transformation

The full execution flow is: interceptors → guards → parameter resolution → parameter pipes → handler invocation → exception filters → response transformers.

Created via `createExecutionDispatcher()` in `packages/core/src/adapter/execution-factory.ts`, which wires all executors into an `ExecutionEngine` and returns an `ExecutionDispatcher` that runs through the `ExecutionPipeline`.

### Semantic gap fixes in execution pipeline

- **Route-level `@UsePipes` wiring**: `PipeExecutor` was instantiated but never called by `ExecutionEngine`. It is now invoked after the handler returns and before transformers, allowing route-level pipes to transform handler output values.
- **Guard denial → 403**: `GuardExecutor` previously returned `false` on denial, and `ExecutionEngine` threw a generic `Error("Execution denied by guard")` that surfaced as HTTP 500. The guard executor now throws `ForbiddenException` (403), which flows through `ExceptionFilterExecutor` and is mapped to HTTP 403 by the adapter.
- **Status code propagation**: `RequestExecutor.executeHttp()` previously ignored `statusCode` fields on `SuccessResponse` and `FailureResponse` return values. It now reads `result.statusCode` and calls `response.setStatus()` before sending the body, so HTTP responses correctly reflect 201 (created), 204 (no content), 404 (not found), 403 (forbidden), etc.

### HTTP request matching with path parameters

Path parameter matching is now implemented in `packages/core/src/adapter/node-http-kernel.ts`:

- `NodeHttpKernel.match()` supports `:param` syntax for dynamic path segments
- Wildcard `*` support for catch-all routes
- Route specificity scoring via `pathSpecificity()` to match the most specific route
- Exact path lookup is still preferred when available
- `matchPath()` function in `packages/core/src/router/path.ts` handles the matching logic
- Extracted path parameters are passed to `toHttpRequest()` for binding to `@Param()` decorators

- The `ExpressAdapter` delegates to Express's native path matching (supports `:param` syntax natively), while `UwsAdapter` uses uWS's native `request.getParams()` for path parameter extraction and `NodeHttpKernel.match()` for the Node.js fallback path.

### Examples

- `examples/full/` — full-featured example with DI, guards, interceptors, pipes, transformers, filters, WebSockets, error handling, database integration, and file logging
- `examples/express-minimal/` — minimal Express adapter example with `@Param`, `@Query`, `@Body`, guards, and error handling
- `examples/uws-minimal/` — minimal uWebSockets.js adapter example with WebSocket gateway support
- `examples/env-config/` — environment variable configuration with zod validation
- `examples/testing/` — integration testing patterns with `MemoryLogTarget` and `AdapterLogTarget`
- `examples/http-kernel/` — minimal HTTP kernel example subclassing `NodeHttpKernel` with request ID/trace ID support, file logging, and structured error handling

### uWebSockets.js native path parameter extraction

Updated `UwsAdapter` to use uWS's native `request.getParams()` for path parameter extraction instead of reusing the framework's `matchPath()` function. When uWS manages routing (non-fallback mode), path parameters are extracted by uWS itself during route matching:

- Added `getParams()` to the `UwsHttpRequest` type
- `UwsAdapter.toHttpRequest()` now calls `request.getParams()` directly
- Removed the redundant `matchPath()` call in the uWS request handler
- Removed the now-unnecessary `routePath` parameter from `dispatchUws()` and `toHttpRequest()`
- Removed `matchPath` import from `@sim-lu/core` in uws-adapter
- The Node.js fallback path (`NodeHttpKernel.match()`) still uses `matchPath()` for environments without uWS installed

### Dependency Injection: Async Factory Providers

Made provider resolution fully asynchronous across the entire DI chain. `Container.resolve()` now returns `Promise<T>`, and async-ness cascades through `ContainerComposer`, all 6 provider/executor registries (guard, interceptor, pipe, exception-filter, transformer, controller), all 6 executors, `ModuleRef`, `ApplicationContext`, and the `PluginApplication` interface.

- `Container.resolve()` returns `Promise<T>` (was `T`)
- `Container.resolveClass()` is now async with `Promise.all` for dependency resolution
- `FactoryProvider.useFactory` type changed to `(...args) => T | Promise<T>`
- Factory results are `await`ed — async factories now resolve to their actual value, not a `Promise`
- `ModuleRef.resolve()` and `ModuleRef.get()` return `Promise<T>`
- `ApplicationContext.get()` returns `Promise<T>`
- `PluginApplication.get()` return type changed to `Promise<T>`
- All registry `register()` methods are now async
- All executor `resolveX()` methods are now async; callers use `await`
- All existing tests updated to `await` async calls
- Added regression tests: sync factory, async factory, async factory with injected deps, rejected async factory, multiple async providers, dependent provider receiving async result, startup failure from rejected factory

### Dependency Injection: Scope Semantics

Implemented DI scope semantics (singleton, transient, request) as defined in Phase 7.

**Singleton (default)** — Fully implemented:
- `ContainerComposer` caches instances in `module.instances` and re-registers as `useValue` providers, ensuring a single instance per module container
- `Container.resolve()` now has its own singleton cache (`instances` Map) for runtime resolution of class/factory providers
- Exported providers share the same instance across importing modules

**Transient** — Implemented:
- `ContainerComposer` still instantiates transient providers at bootstrap (for dependency injection and circular dependency detection) but does NOT re-register them as `useValue`
- The original class/factory provider registration remains in the container
- Runtime `Container.resolve()` creates a fresh instance on each call (no caching)
- When injected into a singleton at bootstrap, the singleton holds the initial instance

**Request** — Partially implemented:
- `ContainerComposer` instantiates request-scoped providers at bootstrap (for dependency injection) but does NOT re-register them as `useValue`
- Runtime `Container.resolve()` throws an explicit error for request-scoped providers, indicating a request-scoped child container is required
- Full per-request resolution (via `ExecutionContext`-based child container) is pending

Changes:
- Added `ProviderScope` type (`"singleton" | "request" | "transient"`) to `@sim-lu/common` metadata
- Added `scope?: ProviderScope` to `InjectableMetadata` and `CustomProvider` interface
- `ProviderScope` exported from both `@sim-lu/common` and `@sim-lu/core`
- Added `scope?: ProviderScope` to `ClassProvider` and `FactoryProvider` in `@sim-lu/core/src/container/provider.ts`
- `Container` class: added `instances` Map for singleton caching; added `getScope()` method that reads `provider.scope` or `@Injectable` metadata
- `ContainerComposer`: modified `instantiateToken()` and `instantiateCustomProvider()` to read scope and conditionally re-register as `useValue`
- Added `providerScope()` helper in `provider-utils.ts` for centralized scope resolution
- Exported `ProviderScope` from `packages/core/src/container/index.ts`
- Added integration tests: singleton behavior verification, transient per-resolution test, request scope error handling, custom provider with scope, nested dependency behavior (transient injected into singleton), custom provider transient resolution

### Dependency Injection: Regression Test Expansion

Expanded regression test coverage for all completed architecture hardening phases:

- Verified async factory provider tests: sync factory, async factory, async factory with injected deps, rejected async factory, multiple async providers, dependent receiving resolved value (not Promise), startup failure from rejected factory
- Verified exception filter double-write test: response written exactly once during error handling
- Verified Node fallback HTTP error contract: 400/404/409/500 responses, correlation headers, log entry correlation
- Verified Express/uWS error contract: passes shared `describeHttpErrorContract` tests
- Verified `@WsContext()` provides populated WebSocketContext with socket ID and state
- Verified DI scope integration tests: singleton consistency across requests, transient creates new instances per resolve, request scope throws error outside context, nested dependency behavior
- Test count: 642 → 648 (6 new tests added)
