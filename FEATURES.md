# Feature Log

## `@sim-lu/common`

### Dependency Injection Decorators
| Feature | Description | Location |
|---------|-------------|----------|
| `@Injectable()` | Marks a class as an injectable provider for DI | `decorates/injectable.ts` |
| `@Inject(token)` | Explicit injection token for constructor parameters | `decorates/inject.ts` |
| `@Module()` | Groups providers, controllers, and imports into modules | `decorates/modules.ts` |
| `@Global()` | Marks a module as globally available for import | `decorates/global.ts` |

### Controller & Route Decorators
| Feature | Description | Location |
|---------|-------------|----------|
| `@Controller(path?)` | Marks a class as a controller with optional base path | `decorates/controller.ts` |
| `@Get(path?)`, `@Post(path?)`, `@Put(path?)`, `@Delete(path?)`, `@Patch(path?)`, `@Head(path?)`, `@Options(path?)`, `@Trace(path?)`, `@Connect(path?)` | HTTP method route decorators | `decorates/http.ts` |
| `@Route(method, path)` | Generic HTTP route decorator | `decorates/http.ts` |
| `@WebSocket(path)` | Marks a class as a WebSocket gateway | `decorates/websocket.ts` |

### HTTP Parameter Decorators
| Feature | Description | Location |
|---------|-------------|----------|
| `@Param(name?)` | Binds route path parameters | `decorates/http-params.ts` |
| `@Query(name?)` | Binds query string parameters | `decorates/http-params.ts` |
| `@Body()` | Binds the parsed request body | `decorates/http-params.ts` |
| `@Headers(name)` | Binds a specific request header | `decorates/http-params.ts` |
| `@Cookies(name?)` | Binds cookie values | `decorates/http-params.ts` |
| `@Session(name?)` | Binds session values | `decorates/http-params.ts` |
| `@Request()` | Binds the raw HTTP request object | `decorates/http-params.ts` |
| `@Response()` | Binds the raw HTTP response object | `decorates/http-params.ts` |
| `@Ctx()` / `@ExecutionContext` | Binds the execution context | `decorates/http-params.ts` |

### Cross-Cutting Decorators
| Feature | Description | Location |
|---------|-------------|----------|
| `@UseGuards()` | Registers guard implementations | `decorates/guard.ts` |
| `@UseFilters()` | Registers exception filter implementations | `decorates/exception-filter.ts` |
| `@UseInterceptors()` | Registers interceptor implementations | `decorates/interceptor.ts` |
| `@UsePipes()` | Registers pipe implementations | `decorates/pipe.ts` |
| `@UseTransformers()` | Registers transformer implementations | `decorates/transform.ts` |
| `@Catch()` | Marks a class as an exception filter | `decorates/exception-filter.ts` |

### WebSocket Event Decorators
| Feature | Description | Location |
|---------|-------------|----------|
| `@On(event)` | WebSocket event handler registration | `decorates/websocket-events.ts` |
| `@OnOpen()` | WebSocket connection open handler | `decorates/websocket-events.ts` |
| `@OnMessage()` | WebSocket message handler | `decorates/websocket-events.ts` |
| `@OnClose()` | WebSocket connection close handler | `decorates/websocket-events.ts` |

### WebSocket Parameter Decorators
| Feature | Description | Location |
|---------|-------------|----------|
| `@WsSocket()` | Binds the WebSocket socket | `decorates/websocket-params.ts` |
| `@WsMessage()` | Binds the WebSocket message | `decorates/websocket-params.ts` |
| `@WsContext()` | Binds the WebSocket context | `decorates/websocket-params.ts` |

### Lifecycle Interfaces
| Feature | Description | Location |
|---------|-------------|----------|
| `OnModuleInit` | Called after module is initialized | `interfaces/lifecycle.ts` |
| `OnApplicationBootstrap` | Called after all modules are bootstrapped | `interfaces/lifecycle.ts` |
| `OnModuleDestroy` | Called during application shutdown | `interfaces/lifecycle.ts` |
| `BeforeApplicationShutdown` | Called before application shutdown | `interfaces/lifecycle.ts` |
| `OnApplicationShutdown` | Called during application shutdown | `interfaces/lifecycle.ts` |

### Metadata System
| Feature | Description | Location |
|---------|-------------|----------|
| `METADATA_KEYS` | Constants for all metadata keys | `metadata/keys.ts` |
| `ParameterMetadata` | Parameter metadata type | `metadata/types.ts` |
| `ParameterType` | Parameter type union | `metadata/types.ts` |
| `ModuleMetadata` | Module metadata type | `metadata/types.ts` |
| `DynamicModule` | Dynamic module configuration | `metadata/types.ts` |
| `CustomProvider` | Custom provider configuration | `metadata/types.ts` |
| `ModuleProvider` | Module provider type | `metadata/types.ts` |
| `ProviderToken` | Provider token type | `metadata/types.ts` |
| `InjectableMetadata` | Injectable metadata type | `metadata/types.ts` |

### Request/Trace Correlation
| Feature | Description | Location |
|---------|-------------|----------|
| `generateRequestId()` | Generates a unique request ID | `correlation.ts` |
| `generateTraceId()` | Generates a unique trace ID | `correlation.ts` |
| `generateSpanId()` | Generates a random span ID | `correlation.ts` |
| `extractRequestId(headers)` | Extracts request ID from headers | `correlation.ts` |
| `extractTraceId(headers)` | Extracts trace ID from headers | `correlation.ts` |

## `@sim-lu/core`

### Application Bootstrap
| Feature | Description | Location |
|---------|-------------|----------|
| `ApplicationContext` | Root application context with DI and lifecycle | `application/application-context.ts` |
| `createApplicationContext()` | Factory to create application context | `application/factory.ts` |
| `createApplication()` | Factory to create app with adapter | `application/factory.ts` |
| `ModuleWrapper` | Runtime wrapper for compiled modules | `application/module-wrapper.ts` |
| `ModuleCompiler` | Walks imports, detects cycles, deduplicates | `application/module-compiler.ts` |
| `ContainerComposer` | Composes modules in depth-first import order | `application/container-composer.ts` |
| `LifecycleExecutor` | Invokes lifecycle hooks in correct order | `application/lifecycle-executor.ts` |
| `GlobalEnhancers` | Manages global interceptors, guards, filters | `application/global-enhancers.ts` |
| `ProviderUtils` | Utility functions for provider resolution | `application/provider-utils.ts` |

### Container & DI
| Feature | Description | Location |
|---------|-------------|----------|
| `Container` | Module-scoped DI container (resolve returns `Promise<T>`) | `container/container.ts` |
| `Provider` | Provider configuration type | `container/provider.ts` |
| `ProviderToken` | String or symbol token | `container/token.ts` |
| Circular dependency detection | Detects circular provider deps | `container-composer.ts` |
| Singleton instantiation | Providers instantiated once per module | `container-composer.ts` |
| Async factory providers | `useFactory` may return `T` or `Promise<T>`; result is awaited | `container.ts`, `container-composer.ts` |
| Export re-binding | Exported providers rebound as value providers | `container-composer.ts` |
| Re-export support | `exports: [SomeModule]` pattern | `container-composer.ts` |

### Router
| Feature | Description | Location |
|---------|-------------|----------|
| `RouteRegistry` | Collects discovered routes | `router/route-registry.ts` |
| `RouteExplorer` | Discovers routes from metadata | `router/route-explorer.ts` |
| `HttpRouteDefinition` | HTTP route definition | `router/route-definition.ts` |
| `WebSocketRouteDefinition` | WebSocket route definition | `router/route-definition.ts` |
| `joinPaths()` | Concatenates controller and method paths | `router/path.ts` |
| `matchHttp(method, path)` | Exact HTTP method+path matching | `router/route-registry.ts` |
| Duplicate route detection | Throws on duplicate routes | `router/route-registry.ts` |

### Execution Engine
| Feature | Description | Location |
|---------|-------------|----------|
| `ExecutionRunner` | Orchestrates execution flow | `execution/execution-runner.ts` |
| `ExecutionPipeline` | Chains execution pipeline | `execution/execution-pipeline.ts` |
| `ExecutionDispatcher` | Routes requests to handlers | `execution/execution-dispatcher.ts` |
| `ExecutionContext` | Runtime context for handlers | `execution/execution-context.ts` |
| `HandlerRef` | Handler reference | `execution/handler-ref.ts` |
| `HandlerResolver` | Handler resolution | `execution/handler-resolve.ts` |

### Parameter Resolution
| Feature | Description | Location |
|---------|-------------|----------|
| `ParameterResolver` | Resolves method parameters | `parameter/parameter-resolver.ts` |
| `ParameterMetadata` | Stores parameter metadata | `parameter/parameter-metadata.ts` |
| `ParameterPipeExecutor` | Executes per-parameter pipes | `parameter/parameter-pipe-executor.ts` |

### Controllers
| Feature | Description | Location |
|---------|-------------|----------|
| `ControllerRef` | Controller reference | `controller/controller-ref.ts` |
| `ControllerRegistry` | Per-module controller registry | `controller/controller-registry.ts` |

### Pipes
| Feature | Description | Location |
|---------|-------------|----------|
| `UsePipes` | Decorator for pipe registration (route-level and parameter-level) | `decorates/pipe.ts` |
| `PipeContext` | Pipe execution context | `pipe/pipe-context.ts` |
| `PipeExecutor` | Executes route-level `@UsePipes` pipes on handler return values | `pipe/pipe-executor.ts` |
| `PipeMetadata` | Pipe metadata (controller + handler level) | `pipe/pipe-metadata.ts` |
| `PipeRegistry` | Pipe registry | `pipe/pipe-registry.ts` |

### Interceptors
| Feature | Description | Location |
|---------|-------------|----------|
| `UseInterceptors` | Decorator for interceptor registration | `decorates/interceptor.ts` |
| `InterceptorContext` | Interceptor execution context | `interceptor/interceptor-context.ts` |
| `InterceptorExecutor` | Executes interceptors | `interceptor/interceptor-executor.ts` |
| `InterceptorMetadata` | Interceptor metadata | `interceptor/interceptor-metadata.ts` |
| `InterceptorRegistry` | Interceptor registry | `interceptor/interceptor-registry.ts` |

### Guards
| Feature | Description | Location |
|---------|-------------|----------|
| `UseGuards` | Decorator for guard registration | `decorates/guard.ts` |
| `GuardContext` | Guard execution context | `guard/guard-context.ts` |
| `GuardExecutor` | Executes guards | `guard/guard-executor.ts` |
| `GuardMetadata` | Guard metadata | `guard/guard-metadata.ts` |
| `GuardRegistry` | Guard registry | `guard/guard-registry.ts` |

### Exception Filters
| Feature | Description | Location |
|---------|-------------|----------|
| `Catch()` | Marks class as exception filter | `decorates/exception-filter.ts` |
| `UseFilters` | Decorator for filter registration | `decorates/exception-filter.ts` |
| `ExceptionFilterContext` | Filter execution context | `exception-filter/exception-filter-context.ts` |
| `ExceptionFilterExecutor` | Executes filters | `exception-filter/exception-filter-executor.ts` |
| `ExceptionFilterMetadata` | Filter metadata | `exception-filter/exception-filter-metadata.ts` |
| `ExceptionFilterRegistry` | Filter registry | `exception-filter/exception-filter-registry.ts` |
| `DefaultExceptionFilter` | Catch-all for unhandled errors | `exception-filter/exception-filter.ts` |

### Transformers
| Feature | Description | Location |
|---------|-------------|----------|
| `UseTransformers` | Decorator for transformer registration | `decorates/transform.ts` |
| `TransformerContext` | Transformer execution context | `transform/transformer-context.ts` |
| `TransformerExecutor` | Executes transformers | `transform/transformer-executor.ts` |
| `TransformerMetadata` | Transformer metadata | `transform/transformer-metadata.ts` |
| `TransformerRegistry` | Transformer registry | `transform/transformer-registry.ts` |

### Adapter System
| Feature | Description | Location |
|---------|-------------|----------|
| `HttpAdapter` interface | Adapter contract | `adapter/http-adapter.ts` |
| `HttpResponse` | HTTP response model | `adapter/http-response.ts` |
| `HttpUtils` | HTTP utility functions | `adapter/http-utils.ts` |
| `ExecutionFactory` | Creates execution contexts | `adapter/execution-factory.ts` |
| `NodeHttpKernel` | Node.js HTTP server layer with path param matching | `adapter/node-http-kernel.ts` |
| `AdapterPlugin` | Plugin interface | `adapter/plugin.ts` |
| `RequestExecutor` | Executes requests; propagates `statusCode` from result to HTTP response | `adapter/request-executor.ts` |

### Execution Engine Integration
| Feature | Description | Location |
|---------|-------------|----------|
| `ExecutionEngine` | Orchestrates interceptors → guards → pipes → runner → filters → transformers | `execution/execution-engine.ts` |
| `PipeExecutor` | Executes route-level `@UsePipes` on handler return value | `pipe/pipe-executor.ts` |
| `InterceptorExecutor` | Wraps handler execution with interceptor chain | `interceptor/interceptor-executor.ts` |
| `GuardExecutor` | Runs guards before handler invocation; throws `ForbiddenException` on denial | `guard/guard-executor.ts` |
| `ExceptionFilterExecutor` | Catches exceptions and converts to SerializedBody | `exception-filter/exception-filter-executor.ts` |
| `TransformerExecutor` | Transforms handler return values | `transform/transformer-executor.ts` |
| `ExecutionPipeline` | Middleware-style execution pipeline | `execution/execution-pipeline.ts` |
| `ExecutionDispatcher` | Dispatches requests through pipeline to engine | `execution/execution-dispatcher.ts` |
| `createExecutionDispatcher()` | Factory wiring all executors into engine + dispatcher | `adapter/execution-factory.ts` |

### HTTP Path Parameter Matching
| Feature | Description | Location |
|---------|-------------|----------|
| `matchPath(template, path)` | Matches `:param` syntax and `*` wildcards | `router/path.ts` |
| `pathSpecificity(template)` | Scores route specificity for ranking | `router/path.ts` |
| `PathParams` type | Record of extracted path parameters | `router/path.ts` |
| `extractParamNames(path)` | Extracts parameter names from path | `adapter/http-utils.ts` |
| `RouteRegistry.matchHttp()` | Match HTTP route by method+path with params | `router/route-registry.ts` |
| `RouteRegistry.matchHttpRequest()` | Match with detailed `HttpRouteMatch` (route + params) | `router/route-registry.ts` |
| `NodeHttpKernel.match()` | Exact match first, then pattern match with scoring | `adapter/node-http-kernel.ts` |
| `request.getParams()` | Native uWS path parameter extraction | `platform-uws/uws-adapter.ts` |

## `@sim-lu/platform-express`

| Feature | Description | Location |
|---------|-------------|----------|
| `ExpressAdapter` | Express.js HTTP adapter | `express-adapter.ts` |
| Request ID generation | Generates/extracts `x-request-id` | `express-adapter.ts` |
| Trace ID propagation | Generates/extracts `x-trace-id` | `express-adapter.ts` |
| Response header injection | Sets `x-request-id` / `x-trace-id` | `express-adapter.ts` |
| Error normalization | Converts Express errors to exceptions | `express-adapter.ts` |

## `@sim-lu/platform-uws`

| Feature | Description | Location |
|---------|-------------|----------|
| `UwsAdapter` | uWebSockets.js HTTP adapter | `uws-adapter.ts` |
| Request ID generation | Generates/extracts `x-request-id` | `uws-adapter.ts` |
| Trace ID propagation | Generates/extracts `x-trace-id` | `uws-adapter.ts` |
| WebSocket support | Native WS via `@WebSocket()` gateways | `uws-adapter.ts` |

## `@sim-lu/http`

| Feature | Description | Location |
|---------|-------------|----------|
| `HttpConnection` | HTTP server connection type | `http/context.ts` |
| `HttpRequest` | HTTP request type (with requestId/traceId) | `http/request.ts` |
| `CookieOptions` | Cookie configuration type | `http/index.ts` |
| `HttpResponse` | HTTP response type | `http/response.ts` |
| `ExecutionType` | HTTP vs WebSocket enum | `http/index.ts` |
| `WebSocketSocket` | WebSocket socket type | `websocket/socket.ts` |
| `WebSocketContext` | WebSocket context type | `websocket/context.ts` |
| `WebSocketMessageContext` | WebSocket message context | `websocket/message.ts` |

## `@sim-lu/error`

### HTTP Exceptions
| Feature | Description | Location |
|---------|-------------|----------|
| `HttpException` | Base exception class | `http-exception.ts` |
| `BadRequestException` | 400 Bad Request | `http-exception.ts` |
| `UnauthorizedException` | 401 Unauthorized | `http-exception.ts` |
| `PaymentRequiredException` | 402 Payment Required | `http-exception.ts` |
| `ForbiddenException` | 403 Forbidden | `http-exception.ts` |
| `NotFoundException` | 404 Not Found | `http-exception.ts` |
| `MethodNotAllowedException` | 405 Method Not Allowed | `http-exception.ts` |
| `NotAcceptableException` | 406 Not Acceptable | `http-exception.ts` |
| `ConflictException` | 409 Conflict | `http-exception.ts` |
| `GoneException` | 410 Gone | `http-exception.ts` |
| `PayloadTooLargeException` | 413 Payload Too Large | `http-exception.ts` |
| `UnsupportedMediaTypeException` | 415 Unsupported Media Type | `http-exception.ts` |
| `UnprocessableEntityException` | 422 Unprocessable Entity | `http-exception.ts` |
| `TooManyRequestsException` | 429 Too Many Requests | `http-exception.ts` |
| `InternalServerErrorException` | 500 Internal Server Error | `http-exception.ts` |
| `NotImplementedException` | 501 Not Implemented | `http-exception.ts` |
| `BadGatewayException` | 502 Bad Gateway | `http-exception.ts` |
| `ServiceUnavailableException` | 503 Service Unavailable | `http-exception.ts` |
| `GatewayTimeoutException` | 504 Gateway Timeout | `http-exception.ts` |

### Response Helpers
| Feature | Description | Location |
|---------|-------------|----------|
| `ok()` | Success response | `response.ts` |
| `created()` | Created response (201) | `response.ts` |
| `noContent()` | No content response (204) | `response.ts` |
| `fail()` | Failure response builder | `response.ts` |
| `normalizeError()` | Normalize any thrown value | `response.ts` |
| `toErrorBody()` | Serialize error to body | `response.ts` |
| `toFailureResponse()` | Convert error to FailureResponse | `response.ts` |
| `fromHttpException()` | Convert HttpException to response | `response.ts` |
| `SnapshotRequest` | Captures request context | `response.ts` |

### Logging
| Feature | Description | Location |
|---------|-------------|----------|
| `createErrorLogger()` | Winston-based logger factory | `logger.ts` |
| `MemoryLogTarget` | In-memory log target | `logger.ts` |
| `ElasticLogTarget` | Elasticsearch log target | `logger.ts` |
| `StreamLogTarget` | Stream-based log target | `logger.ts` |
| `WebhookLogTarget` | HTTP webhook log target | `logger.ts` |
| `AdapterLogTarget` | Adapter-style log with transformer | `adapter-log-target.ts` |
| `createLogTarget()` | Factory for AdapterLogTarget | `adapter-log-target.ts` |
| `logNormalizedError()` | Logs normalized errors with context | `logger.ts` |
| `LogEntry` | Structured log entry (with requestId/traceId) | `logger.ts` |
| `LoggerOptions` | Logger configuration | `logger.ts` |

### Error Handling
| Feature | Description | Location |
|---------|-------------|----------|
| `ErrorHandler` | Main error handler class | `handler.ts` |
| `DefaultExceptionFilter` | Catch-all filter | `default-filter.ts` |
| `createPlatformErrorHandler()` | Platform-specific handler | `adapter.ts` |
| `resolveException()` | Exception resolution | `adapter.ts` |
| `handleAdapterError()` | Adapter error handler | `adapter.ts` |
| `notFoundBody()` | 404 response body | `adapter.ts` |
| `applySerializedBody()` | Apply serialized body to response | `adapter.ts` |

### Utilities
| Feature | Description | Location |
|---------|-------------|----------|
| `serializeJson()` | Safe JSON serialization | `json.ts` |
| `createSafeReplacer()` | Circular reference replacer | `json.ts` |
| `createMorganLogger()` | Morgan HTTP logging | `morgan.ts` |
| `createMemoryUploadOptions()` | Multer memory config | `upload.ts` |
| `createUploadMiddleware()` | File upload middleware | `upload.ts` |

### HTTP Status
| Feature | Description | Location |
|---------|-------------|----------|
| `HttpStatus` | Status code constants | `http-status.ts` |
| `HTTP_STATUS_NAMES` | Status code to name map | `http-status.ts` |
| `getStatusName()` | Get name by code | `http-status.ts` |
| `getStatusLine()` | Get status line | `http-status.ts` |

## `@sim-lu/database`

| Feature | Description | Location |
|---------|-------------|----------|
| `DatabaseService` | Injectable database service | `database.service.ts` |
| `DatabaseModule` | Module providing database adapter | `database.module.ts` |
| `DatabasePlugin` | Application plugin | `database.plugin.ts` |
| `MemoryDatabaseAdapter` | In-memory adapter | `adapter/memory-adapter.ts` |
| `SqlDatabaseAdapter` | SQL adapter | `adapter/sql-adapter.ts` |
| `DatabaseAdapter` | Adapter interface | `adapter/database-adapter.ts` |
| `DatabaseOperations` | CRUD interface | `adapter/database-adapter.ts` |
| `QueryResult` | Query result type | `adapter/database-adapter.ts` |
| `SqlValue` | SQL value type | `adapter/database-adapter.ts` |
| `TransactionHandle` | Transaction handle type | `adapter/database-adapter.ts` |
| `DATABASE` | Injection token | `tokens.ts` |
| `DATABASE_OPTIONS` | Options injection token | `tokens.ts` |
| `createDatabaseAdapter()` | Factory function | `database.module.ts` |
| `resolveDatabaseOptions()` | Resolves options from config | `database.module.ts` |
