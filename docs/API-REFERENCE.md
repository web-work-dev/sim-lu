# API Reference

This is the API reference for the public exports of all `@sim-lu` packages.

---

## Table of Contents

1. [`@sim-lu/common`](#sim-lucommon)
2. [`@sim-lu/http`](#sim-luhttp)
3. [`@sim-lu/core`](#sim-lucore)
4. [`@sim-lu/error`](#sim-luerror)
5. [`@sim-lu/platform-express`](#sim-luplatform-express)
6. [`@sim-lu/platform-uws`](#sim-luplatform-uws)
7. [`@sim-lu/database`](#sim-ludatabase)

---

## `@sim-lu/common`

### Decorators

#### `@Injectable(options?)`

Marks a class as a provider for dependency injection.

```typescript
interface InjectableMetadata {
    scope?: "singleton" | "request" | "transient";
}
```

#### `@Inject(token)`

Explicitly specifies the injection token for a constructor parameter.

```typescript
constructor(@Inject("DATABASE") private readonly db: DatabaseAdapter) {}
```

#### `@Module(options)`

Groups providers, controllers, and imports into a module.

```typescript
interface ModuleMetadata {
    imports?: readonly (Function | DynamicModule)[];
    controllers?: readonly Function[];
    providers?: readonly ModuleProvider[];
    exports?: readonly ProviderToken[];
    global?: boolean;
}
```

#### `@Global()`

Marks a module as globally available.

#### `@Controller(path?)`

Marks a class as an HTTP controller.

#### HTTP Method Decorators

`@Get(path?)`, `@Post(path?)`, `@Put(path?)`, `@Patch(path?)`, `@Delete(path?)`, `@Head(path?)`, `@Options(path?)`, `@Trace(path?)`, `@Connect(path?)`

#### `@Route(method, path)`

Generic HTTP route decorator.

```typescript
@Route("GET", "custom")
public handler() {}
```

#### `@WebSocket(path)`

Marks a class as a WebSocket gateway.

#### WebSocket Event Decorators

`@On(event)`, `@OnOpen()`, `@OnMessage()`, `@OnClose()`

#### WebSocket Parameter Decorators

`@WsSocket()`, `@WsMessage()`, `@WsContext()`

#### HTTP Parameter Decorators

`@Param(name?)`, `@Query(name?)`, `@Body()`, `@Headers(name)`, `@Cookies(name?)`, `@Session(name?)`, `@Request()`, `@Response()`, `@Ctx()`, `@ExecutionContext()`

#### Cross-Cutting Decorators

`@UseGuards(...guards)`, `@UseInterceptors(...interceptors)`, `@UsePipes(...pipes)`, `@UseFilters(...filters)`, `@UseTransformers(...transformers)`

#### `@Catch(...exceptionTypes)`

Marks a class as an exception filter and specifies which exception types to catch.

### Metadata

#### `METADATA_KEYS`

```typescript
const METADATA_KEYS = {
    CONTROLLER: Symbol("@sim-lu:controller"),
    INJECTABLE: Symbol("@sim-lu:injectable"),
    MODULE: Symbol("@sim-lu:module"),
    PIPE: Symbol("@sim-lu:pipe"),
    INTERCEPTOR: Symbol("@sim-lu:interceptor"),
    PARAMETER_PIPES: Symbol("@sim-lu:parameter-pipes"),
    GUARD: Symbol("@sim-lu:guard"),
    EXCEPTION_FILTER: Symbol("@sim-lu:exception-filter"),
    CATCH: Symbol("@sim-lu:catch"),
    ROUTES: Symbol("@sim-lu:routes"),
    WEBSOCKET: Symbol("@sim-lu:websocket"),
    WEBSOCKET_EVENTS: Symbol("@sim-lu:websocket-events"),
    CONSTRUCTOR_PARAMS: Symbol("@sim-lu:constructor-params"),
    PARAM: Symbol("@sim-lu:param"),
    TRANSFORM: Symbol("@sim-lu:transform"),
    GLOBAL_MODULE: Symbol("@sim-lu:global-module"),
};
```

### Lifecycle Interfaces

```typescript
interface OnModuleInit {
    onModuleInit(): void | Promise<void>;
}

interface OnApplicationBootstrap {
    onApplicationBootstrap(): void | Promise<void>;
}

interface BeforeApplicationShutdown {
    beforeApplicationShutdown(signal?: string): void | Promise<void>;
}

interface OnModuleDestroy {
    onModuleDestroy(): void | Promise<void>;
}

interface OnApplicationShutdown {
    onApplicationShutdown(signal?: string): void | Promise<void>;
}
```

### Correlation Utilities

```typescript
function generateRequestId(): string;
function generateTraceId(): string;
function generateSpanId(): string;
function extractRequestId(headers: Record<string, unknown>): string | undefined;
function extractTraceId(headers: Record<string, unknown>): string | undefined;
```

### Other Types

```typescript
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "TRACE" | "CONNECT";
type ProviderToken = Function | string | symbol;
type ModuleProvider = Function | CustomProvider;

interface CustomProvider {
    readonly token: ProviderToken;
    readonly useClass?: Function;
    readonly useValue?: unknown;
    readonly useFactory?: (...args: unknown[]) => unknown | Promise<unknown>;
    readonly inject?: readonly ProviderToken[];
}

interface DynamicModule extends ModuleMetadata {
    module: Function;
}
```

---

## `@sim-lu/http`

### HTTP Types

```typescript
interface HttpConnection {
    readonly remoteAddress: string;
    readonly remotePort: number;
}

interface HttpRequest {
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string | string[] | undefined>;
    readonly query: Record<string, string | string[] | undefined>;
    readonly params: Record<string, string | string[] | undefined>;
    readonly body: unknown;
    readonly cookies: Record<string, string | undefined>;
    readonly ip: string;
    readonly userAgent: string;
    readonly requestId?: string;
    readonly traceId?: string;
    readonly connection: HttpConnection;
}

interface HttpResponse {
    readonly status: number;
    readonly body: unknown;
    readonly headers: Record<string, string | string[] | undefined>;
    readonly cookies: Record<string, string | undefined>;
}

interface CookieOptions {
    readonly httpOnly?: boolean;
    readonly secure?: boolean;
    readonly maxAge?: number;
    readonly path?: string;
    readonly domain?: string;
    readonly sameSite?: "strict" | "lax" | "none";
}

type ExecutionType = "http" | "websocket";
type ExecutionContext = "http" | "websocket";  // Note: also in @sim-lu/core
```

### WebSocket Types

```typescript
interface WebSocketSocket {
    readonly id: string;
    send(data: string | ArrayBuffer | Uint8Array): void;
    close(code?: number, reason?: string): void;
    terminate(): void;
}

interface WebSocketContext {
    readonly socket: WebSocketSocket;
    readonly params: Record<string, string | string[] | undefined>;
    readonly query: Record<string, string | string[] | undefined>;
    readonly headers: Record<string, string | string[] | undefined>;
    readonly cookies: Record<string, string | undefined>;
    readonly state: Map<string, unknown>;
}

interface WebSocketMessageContext<T = unknown> {
    readonly message: T;
    readonly context: WebSocketContext;
}
```

---

## `@sim-lu/core`

### Application

```typescript
class ApplicationContext {
    static create(
        rootModule: Function | DynamicModule,
        adapter?: HttpAdapter,
        options?: CreateApplicationOptions,
    ): Promise<ApplicationContext>;

    init(): Promise<this>;
    listen(options: ListenOptions): Promise<this>;
    listen(adapter: HttpAdapter, options: ListenOptions): Promise<this>;
    close(signal?: string): Promise<void>;

    get<T>(token: InjectToken<T>): T;
    select(module: Function): ModuleRef;
    has(token: InjectToken): boolean;
    provide<T>(token: InjectToken<T>, value: T): this;
    decorate<T>(token: InjectToken<T>, value: T): this;
    onClose(hook: () => void | Promise<void>): this;
    register(plugin: ApplicationPlugin, options?: unknown): Promise<this>;

    isInitialized(): boolean;
    isListening(): boolean;
    getAdapter(): HttpAdapter | undefined;
    getRouteRegistry(): RouteRegistry;
    getRoutes(): readonly RouteDefinition[];
    getHttpRoutes(): readonly HttpRouteDefinition[];
    getWebSocketRoutes(): readonly WebSocketRouteDefinition[];

    useGlobalFilters(...filters: readonly Function[]): this;
    useGlobalGuards(...guards: readonly Function[]): this;
    useGlobalInterceptors(...interceptors: readonly Function[]): this;
    useGlobalPipes(...pipes: readonly Function[]): this;
    useGlobalTransformers(...transformers: readonly Function[]): this;
    setDefaultExceptionFilter(filter: ExceptionFilter): this;
}

async function createApplication(
    rootModule: Function | DynamicModule,
    adapter: HttpAdapter,
    options?: CreateApplicationOptions,
): Promise<ApplicationContext>;

async function createApplicationContext(
    rootModule: Function | DynamicModule,
    options?: CreateApplicationOptions,
): Promise<ApplicationContext>;
```

### DI Container

```typescript
class Container {
    register<T>(provider: Provider<T>): void;
    resolve<T>(token: InjectToken<T>): Promise<T>;
    has(token: InjectToken): boolean;
    tokens(): Iterable<InjectToken>;
}

class ModuleRef {
    resolve<T>(token: InjectToken<T>): Promise<T>;
    get<T>(token: InjectToken<T>): Promise<T>;  // alias of resolve
    has(token: InjectToken): boolean;
}
```

### Router

```typescript
class RouteRegistry {
    registerController<TController>(controller: ControllerRef<TController>): readonly RouteDefinition<TController>[];
    exploreModules(modules: readonly ModuleWrapper[]): readonly RouteDefinition[];
    getAll(): readonly RouteDefinition[];
    getHttpRoutes(): readonly HttpRouteDefinition[];
    getWebSocketRoutes(): readonly WebSocketRouteDefinition[];
    matchHttp(method: HttpMethod, path: string): HttpRouteDefinition | undefined;
    matchHttpRequest(method: HttpMethod, path: string): HttpRouteMatch | undefined;
}
```

### Execution Engine

```typescript
class ExecutionEngine {
    execute<TController extends object>(
        handler: HandlerRef<TController>,
        context: ExecutionContext<TController>,
    ): Promise<unknown>;
}

class ExecutionDispatcher {
    execute<TController extends object>(
        handler: HandlerRef<TController>,
        context: ExecutionContext<TController>,
    ): Promise<unknown>;
}

class ExecutionContext<TController extends object = object> {
    readonly handler: HandlerRef<TController>;
    readonly transport: ExecutionTransport;  // "http" | "websocket"

    set<T>(key: string, value: T): void;
    get<T>(key: string): T | undefined;
    has(key: string): boolean;
    delete(key: string): boolean;
    getState(): ReadonlyMap<string, unknown>;
}
```

### HTTP Adapter

```typescript
interface HttpAdapter {
    readonly name: string;
    registerHttp(route: HttpRouteDefinition, handler: AdapterHttpHandler): void;
    registerWebSocket?(path: string, routes: readonly WebSocketRouteDefinition[], handler: AdapterWebSocketHandler): void;
    listen(options: ListenOptions): Promise<void>;
    close(): Promise<void>;
}

interface ListenOptions {
    readonly port: number;
    readonly host?: string;
}

class NodeHttpKernel implements HttpAdapter {
    protected httpRoutes: RegisteredHttpRoute[];
    protected websocketRoutes: Map<string, readonly WebSocketRouteDefinition[]>;
    protected websocketHandlers: Map<string, AdapterWebSocketHandler>;
    protected server?: Server;
    protected boundPort?: number;

    registerHttp(route: HttpRouteDefinition, handler: AdapterHttpHandler): void;
    registerWebSocket(path: string, routes: readonly WebSocketRouteDefinition[], handler: AdapterWebSocketHandler): void;
    async listen(options: ListenOptions): Promise<void>;
    async close(): Promise<void>;
    getPort(): number | undefined;
    getRegisteredHttpRoutes(): readonly HttpRouteDefinition[];
    getRegisteredWebSocketPaths(): readonly string[];
    async dispatchWebSocket(path: string, event: string, state?: Record<string, unknown>): Promise<unknown>;
    async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void>;

    protected async handle(incoming: IncomingMessage, outgoing: ServerResponse): Promise<void>;
    protected match(method: string, pathname: string): { handler: AdapterHttpHandler; params: Record<string, string | string[] | undefined> } | undefined;
    protected async toRequest(incoming: IncomingMessage, url: string, pathname: string, params: Record<string, string | string[] | undefined>): Promise<HttpRequest>;
    protected async readBody(incoming: IncomingMessage, contentType: string | string[] | undefined): Promise<unknown>;
    protected write(outgoing: ServerResponse, writer: MutableHttpResponse): void;
}

class MutableHttpResponse implements HttpResponse {
    get status(): number;
    get body(): unknown;
    get headers(): Record<string, string | string[] | undefined>;
    get cookies(): Record<string, string | undefined>;
    setStatus(status: number): this;
    setHeader(name: string, value: string | string[]): this;
    send(body: unknown): this;
    setCookie(name: string, value: string, options?: CookieOptions): void;
    clearCookie(name: string, options?: CookieOptions): void;
}
```

### Cross-Cutting Concern Types

```typescript
interface Interceptor {
    intercept(context: ExecutionContext, next: () => unknown | Promise<unknown>): unknown | Promise<unknown>;
}

interface Guard {
    canActivate(context: GuardContext): boolean | Promise<boolean>;
}

interface Pipe<TInput = unknown, TOutput = TInput> {
    transform(value: TInput, context: ExecutionContext): TOutput | Promise<TOutput>;
}

interface ExceptionFilter {
    catch(exception: unknown, context: ExceptionCatchContext): unknown;
}

interface Transformer {
    transform(value: unknown, context: ExecutionContext): unknown | Promise<unknown>;
}

interface GuardContext<TController extends object = object> extends ExecutionContext<TController> {}
interface PipeContext<TController extends object = object> {
    readonly execution: ExecutionContext<TController>;
}
interface ExceptionCatchContext {
    get<T>(key: string): T | undefined;
}
```

### Plugin System

```typescript
interface ApplicationPlugin {
    name?: string;
    module?: (options?: unknown) => Function | DynamicModule | undefined;
    register?: (application: PluginApplication, options?: unknown) => Promise<void>;
}

interface PluginApplication {
    get<T>(token: InjectToken<T>): T;
    provide<T>(token: InjectToken<T>, value: T): this;
    onClose(hook: () => void | Promise<void>): this;
}

interface PluginRegistration {
    plugin: ApplicationPlugin;
    options?: unknown;
}

interface CreateApplicationOptions {
    readonly plugins?: readonly PluginRegistration[];
}
```

---

## `@sim-lu/error`

### HTTP Exceptions

```typescript
class HttpException {
    readonly statusCode: number;
    readonly message: string;
    readonly error: string;
    readonly details?: unknown;
    readonly headers: Record<string, string | string[]>;
    readonly cause?: unknown;
    readonly stack?: string;
    readonly name: string;
}

// Pre-built exceptions:
class BadRequestException extends HttpException {}        // 400
class UnauthorizedException extends HttpException {}      // 401
class PaymentRequiredException extends HttpException {}   // 402
class ForbiddenException extends HttpException {}         // 403
class NotFoundException extends HttpException {}          // 404
class MethodNotAllowedException extends HttpException {}  // 405
class NotAcceptableException extends HttpException {}     // 406
class ConflictException extends HttpException {}          // 409
class GoneException extends HttpException {}              // 410
class PayloadTooLargeException extends HttpException {}   // 413
class UnsupportedMediaTypeException extends HttpException {} // 415
class UnprocessableEntityException extends HttpException {} // 422
class TooManyRequestsException extends HttpException {}   // 429
class InternalServerErrorException extends HttpException {} // 500
class NotImplementedException extends HttpException {}    // 501
class BadGatewayException extends HttpException {}        // 502
class ServiceUnavailableException extends HttpException {} // 503
class GatewayTimeoutException extends HttpException {}    // 504
```

### Response Helpers

```typescript
function ok<T>(data: T, statusCode?: number, meta?: Record<string, unknown>): SuccessResponse<T>;
function created<T>(data: T, meta?: Record<string, unknown>): SuccessResponse<T>;  // 201
function noContent(): SuccessResponse<null>;  // 204
function fail(statusCode: number, message: string, details?: unknown): FailureResponse;

interface SuccessResponse<T = unknown> {
    readonly success: true;
    readonly statusCode: number;
    readonly data: T;
    readonly meta?: Record<string, unknown>;
}

interface FailureResponse {
    readonly success: false;
    readonly statusCode: number;
    readonly error: string;
    readonly message: string;
    readonly details?: unknown;
}

type ApiResponse<T = unknown> = SuccessResponse<T> | FailureResponse;
```

### Error Normalization

```typescript
interface NormalizedError {
    readonly statusCode: number;
    readonly error: string;
    readonly message: string;
    readonly details: unknown;
    readonly headers: Record<string, string | string[]>;
    readonly stack: string | undefined;
    readonly name: string;
    readonly cause: unknown;
    readonly exception: unknown;
}

function normalizeError(exception: unknown): NormalizedError;
function toErrorBody(exception: unknown, includeDetails?: boolean): ErrorBody;
function toFailureResponse(exception: unknown, includeDetails?: boolean): FailureResponse;
function fromHttpException(exception: HttpException): FailureResponse;

interface RequestSnapshot {
    readonly method?: string;
    readonly url?: string;
    readonly ip?: string;
    readonly userAgent?: string;
    readonly requestId?: string;
    readonly traceId?: string;
}
```

### Error Handler

```typescript
class ErrorHandler {
    constructor(options?: ErrorHandlerOptions);
    
    getLogger(): Logger;
    handle(exception: unknown, request?: RequestSnapshot): SerializedBody;
    notFound(request?: RequestSnapshot): SerializedBody;
}

interface ErrorHandlerOptions extends LoggerOptions {
    readonly includeDetails?: boolean;
    readonly includeStack?: boolean;
    readonly platform?: string;
}

interface SerializedBody {
    readonly payload: string;
    readonly contentType: string;
    readonly statusCode: number;
    readonly headers: Record<string, string | string[]>;
}
```

### Default Exception Filter

```typescript
class DefaultExceptionFilter {
    constructor(options?: DefaultExceptionFilterOptions | ErrorHandler);
    
    getHandler(): ErrorHandler;
    catch(exception: unknown, context?: ExceptionCatchContext): FailureResponse;
}

function createDefaultExceptionFilter(options?: DefaultExceptionFilterOptions): DefaultExceptionFilter;

interface DefaultExceptionFilterOptions extends ErrorHandlerOptions {
    readonly includeDetails?: boolean;
}

interface ExceptionCatchContext {
    get<T>(key: string): T | undefined;
}
```

### Platform Error Handling

```typescript
function createPlatformErrorHandler(platform: string, options?: ErrorHandlerOptions): ErrorHandler;
function resolveException(exception: unknown): unknown;
function handleAdapterError(handler: ErrorHandler, exception: unknown, request?: RequestSnapshot): SerializedBody;
function notFoundBody(handler: ErrorHandler, request?: RequestSnapshot): SerializedBody;
function applySerializedBody(response: WritableHttpResponse, body: SerializedBody): void;
function snapshotRequest(request: { method?, url?, ip?, userAgent?, requestId?, traceId? }): RequestSnapshot;

interface WritableHttpResponse {
    status: number;
    setHeader(name: string, value: string | string[]): unknown;
    send(body: unknown): unknown;
}
```

### HTTP Status Utilities

```typescript
const HttpStatus = {
    CONTINUE: 100,
    SWITCHING_PROTOCOLS: 101,
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    // ... full list
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
} as const;

function getStatusName(code: number): string;
function getStatusLine(code: number): string;
const HTTP_STATUS_NAMES: Record<number, string>;
type HttpStatusCode = keyof typeof HttpStatus;
```

### Logging

```typescript
function createErrorLogger(options?: LoggerOptions): Logger;  // Winston-based
function logNormalizedError(logger: Logger, normalized: NormalizedError, request?: RequestSnapshot, platform?: string): void;

class MemoryLogTarget { ... }
class ElasticLogTarget { ... }
class StreamLogTarget { ... }
class WebhookLogTarget { ... }
class AdapterLogTarget { ... }

interface LogEntry {
    level: string;
    message: string;
    timestamp: string;
    requestId?: string;
    traceId?: string;
    platform?: string;
    service?: string;
    context?: Record<string, unknown>;
}
```

### JSON Utilities

```typescript
function serializeJson(value: unknown): string;
function createSafeReplacer(): (key: string, value: unknown) => unknown;
```

### Upload Utilities

```typescript
function createMemoryUploadOptions(options?: UploadLimits): memoryUploadOptions;
function createUploadMiddleware(options?: UploadLimits): UploadRequest;
function fromUploadError(error: unknown): HttpException;
function isMulterError(error: unknown): boolean;

interface UploadFile {
    originalname: string;
    buffer: Buffer;
    mimetype: string;
    size: number;
}
type UploadLimits = Record<string, unknown>;
interface UploadErrorLike { field?: string; }
```

---

## `@sim-lu/platform-express`

```typescript
class ExpressAdapter extends NodeHttpKernel {
    readonly name: "express";

    constructor(options?: ExpressAdapterOptions);
    getErrorHandler(): ErrorHandler;
    getInstance(): Express;
    listen(options: ListenOptions): Promise<void>;
    handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void>;
}

interface ExpressAdapterOptions {
    readonly error?: ErrorHandlerOptions;
}
```

---

## `@sim-lu/platform-uws`

```typescript
class UwsAdapter extends NodeHttpKernel {
    readonly name: "uws";

    constructor(options?: UwsAdapterOptions);
    getErrorHandler(): ErrorHandler;
    getInstance(): UwsTemplatedApp | undefined;
    listen(options: ListenOptions): Promise<void>;
    close(): Promise<void>;
}

interface UwsAdapterOptions {
    readonly error?: ErrorHandlerOptions;
}
```

---

## `@sim-lu/database`

### Module and Service

```typescript
class DatabaseService implements DatabaseOperations {
    constructor(adapter: DatabaseAdapter);
    // CRUD methods: insert, find, findOne, update, remove
}

class DatabaseModule {
    static forRoot(options?: DatabaseModuleOptions): DynamicModule;
    static forAdapter(adapter: DatabaseAdapter, options?: Omit<DatabaseModuleOptions, "adapter">): DynamicModule;
}

class DatabasePlugin implements ApplicationPlugin {
    name: "database";
    module(options?: DatabaseModuleOptions): DynamicModule | undefined;
    register(app: PluginApplication, options?: DatabaseModuleOptions): Promise<void>;
}
```

### Adapters

```typescript
class MemoryDatabaseAdapter implements DatabaseAdapter { ... }
class SqlDatabaseAdapter implements DatabaseAdapter { ... }

interface DatabaseAdapter {
    readonly name: string;
    readonly driver: string;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    query<T>(sql: string, params?: readonly SqlValue[]): Promise<QueryResult<T>>;
    execute(sql: string, params?: readonly SqlValue[]): Promise<number>;
    transaction<T>(work: (tx: TransactionHandle) => Promise<T>): Promise<T>;
}

interface DatabaseOperations {
    insert<T extends Record<string, unknown>>(table: string, data: T): Promise<T>;
    find<T extends Record<string, unknown>>(table: string, where?: Partial<T>): Promise<T[]>;
    findOne<T extends Record<string, unknown>>(table: string, where: Partial<T>): Promise<T | undefined>;
    update<T extends Record<string, unknown>>(table: string, where: Partial<T>, data: Partial<T>): Promise<number>;
    remove<T extends Record<string, unknown>>(table: string, where: Partial<T>): Promise<number>;
}

type SqlValue = string | number | boolean | null | Buffer | Date;
interface QueryResult<T = Record<string, unknown>> {
    readonly rows: readonly T[];
    readonly rowCount: number;
}
interface TransactionHandle {
    query<T = Record<string, unknown>>(sql: string, params?: readonly SqlValue[]): Promise<QueryResult<T>>;
}
```

### Configuration

```typescript
const DATABASE = Symbol("DATABASE");
const DATABASE_OPTIONS = Symbol("DATABASE_OPTIONS");

interface DatabaseModuleOptions {
    driver?: "memory" | "postgres" | "mysql" | "sqlite";
    adapter?: DatabaseAdapter;
    client?: Sql;
    autoConnect?: boolean;
}

function createDatabaseAdapter(options: DatabaseModuleOptions): DatabaseAdapter;
function resolveDatabaseOptions(options?: DatabaseModuleOptions): DatabaseModuleOptions;
```
