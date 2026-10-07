# Decorators Reference

This guide covers all decorators available in the `@sim-lu` framework, organized by category.

---

## Table of Contents

1. [Module Decorators](#module-decorators)
2. [Dependency Injection Decorators](#dependency-injection-decorators)
3. [Controller and Route Decorators](#controller-and-route-decorators)
4. [HTTP Parameter Decorators](#http-parameter-decorators)
5. [WebSocket Decorators](#websocket-decorators)
6. [Cross-Cutting Concern Decorators](#cross-cutting-conern-decorators)
7. [Metadata Keys](#metadata-keys)

---

## Module Decorators

### `@Module(options)`

Groups providers, controllers, and imports into a cohesive unit.

```typescript
@Module({
    controllers: [UserController],
    providers: [UserService],
    imports: [DatabaseModule],
    exports: [UserService],
})
export class UserModule {}
```

**Options:**

| Property     | Type         | Description                         |
| ------------ | ------------ | ----------------------------------- |
| `controllers` | `Function[]` | Controller classes to register      |
| `providers`  | `ModuleProvider[]` | Services/injectables           |
| `imports`    | `Function[] \| DynamicModule[]` | Imported modules       |
| `exports`    | `ProviderToken[]` | Tokens exported to importers   |
| `global`     | `boolean`    | Mark as globally available          |

### `@Global()`

Marks a module as globally available, so its exports can be injected without explicit import.

```typescript
@Global()
@Module({
    providers: [ConfigService],
    exports: [ConfigService],
})
export class ConfigModule {}
```

### Dynamic Modules

Modules can export factory methods that produce `DynamicModule`:

```typescript
@Module({})
export class DatabaseModule {
    static forRoot(options: DatabaseOptions): DynamicModule {
        return {
            module: DatabaseModule,
            global: true,
            providers: [
                { token: DATABASE_OPTIONS, useValue: options },
                DatabaseService,
            ],
            exports: [DatabaseService],
        };
    }
}
```

---

## Dependency Injection Decorators

### `@Injectable(options?)`

Marks a class as an injectable provider.

```typescript
@Injectable()
export class UserService {
    constructor(private readonly db: DatabaseService) {}
}
```

**Options:**

| Property | Type                        | Description                          |
| -------- | --------------------------- | ------------------------------------ |
| `scope`  | `"singleton"` \| `"request"` \| `"transient"` | Provider scope (default: `"singleton"`) |

### `@Inject(token)`

Explicitly specify which provider to inject for a constructor parameter.

```typescript
@Injectable()
export class AppController {
    constructor(
        @Inject("DATABASE") private readonly db: DatabaseAdapter,
    ) {}
}
```

---

## Controller and Route Decorators

### `@Controller(path?)`

Marks a class as a controller with an optional base path.

```typescript
@Controller("users")
export class UserController {
    @Get()        // → GET /users
    @Post()       // → POST /users
    @Get(":id")   // → GET /users/:id
    public get() {}
}
```

### HTTP Method Decorators

| Decorator | HTTP Method | Description |
| --------- | ----------- | ----------- |
| `@Get(path?)`    | GET    | Read resource |
| `@Post(path?)`   | POST   | Create resource |
| `@Put(path?)`    | PUT    | Replace resource |
| `@Patch(path?)`  | PATCH  | Update resource |
| `@Delete(path?)` | DELETE | Delete resource |
| `@Head(path?)`   | HEAD   | Read headers only |
| `@Options(path?)`| OPTIONS| Read capabilities |
| `@Trace(path?)`  | TRACE  | Diagnostic |
| `@Connect(path?)`| CONNECT| Tunneling |
| `@Route(method, path)` | Any method | Generic route |

```typescript
@Controller("todos")
export class TodoController {
    @Get()                    // GET /todos
    public list() { ... }

    @Get(":id")               // GET /todos/:id
    public get(@Param("id") id: string) { ... }

    @Post()                   // POST /todos
    public create(@Body() body: unknown) { ... }

    @Patch(":id")             // PATCH /todos/:id
    public update(@Param("id") id: string, @Body() body: unknown) { ... }

    @Delete(":id")            // DELETE /todos/:id
    public remove(@Param("id") id: string) { ... }
}
```

### `@WebSocket(path)`

Marks a class as a WebSocket gateway.

```typescript
@WebSocket("chat")
export class ChatGateway {
    @OnOpen()    public onOpen(@WsSocket() socket: WebSocketSocket) {}
    @OnMessage() public onMessage(@WsSocket() socket: WebSocketSocket, @WsMessage() message: string) {}
    @OnClose()   public onClose(@WsSocket() socket: WebSocketSocket) {}
    @On("join")  public onJoin(@WsSocket() socket: WebSocketSocket, @WsMessage() data: string) {}
}
```

---

## HTTP Parameter Decorators

All HTTP parameter decorators are resolved by `ParameterResolver`:

```typescript
@Controller("users")
export class UserController {
    @Get(":id")
    public getUser(
        @Param("id") id: string,              // URL path parameter
        @Query("active") active?: string,     // Query string parameter
        @Body() body: CreateUserDto,           // Request body
        @Headers("authorization") auth: string, // Request header
        @Cookies("session") session: string,  // Cookie value
        @Session("userId") sessionUserId: string, // Session value
        @Request() req: HttpRequest,          // Raw request
        @Response() res: HttpResponse,        // Raw response
        @Ctx() ctx: ExecutionContext,          // Execution context
    ) {}
}
```

### Named vs Unnamed Parameters

```typescript
// Named: binds the specific parameter
@Get(":userId/posts/:postId")
public getPost(@Param("userId") userId: string, @Param("postId") postId: string) {}

// Unnamed: binds the entire object
@Get()
public search(@Query() query: Record<string, string | string[]>) {}
```

### Default Values

```typescript
@Get()
public list(@Query("limit", { default: "10" }) limit: string) {}
```

---

## WebSocket Decorators

### `@WebSocket(path)`

Marks a class as a WebSocket gateway at the given path.

### WebSocket Event Decorators

| Decorator | Event | Description |
| --------- | ----- | ----------- |
| `@On(event)`       | Custom event name | Register handler for a custom event |
| `@OnOpen()`        | `"$open"`    | Connection opened |
| `@OnMessage()`     | `"$message"` | Message received |
| `@OnClose()`       | `"$close"`   | Connection closed |

### WebSocket Parameter Decorators

| Decorator | Key          | Description |
| --------- | ------------ | ----------- |
| `@WsSocket()`    | `ws.socket`    | The WebSocket connection |
| `@WsMessage()`   | `ws.message`   | The incoming message |
| `@WsContext()`   | `ws.context`   | The WebSocket context |
| `@Ctx()`         | ExecutionContext | Full context (same as HTTP) |

**⚠ Important:** `@WsContext()` resolves `context.get("ws.context")`, but no platform adapter currently sets this value. Use `@Ctx()` to access the `ExecutionContext` instead.

---

## Cross-Cutting Concern Decorators

All of these can be applied at the **class level** (applies to all handlers) or **method level** (applies to one handler).

### `@UseGuards(...guards)`

Registers guard classes. Guards run before handler invocation and can deny access.

```typescript
@UseGuards(ApiKeyGuard)
@Controller("secure")
export class SecureController {
    @Get()
    @UseGuards(FeatureFlagGuard)
    public secret() {}
}

class ApiKeyGuard implements Guard {
    canActivate(context: GuardContext): boolean {
        const headers = context.get<HttpRequest>("request").headers;
        const key = headers["x-api-key"];
        return key === process.env.API_KEY;
    }
}
```

When a guard returns `false`, the framework throws `ForbiddenException` → HTTP 403.

### `@UseInterceptors(...interceptors)`

Registers interceptor classes. Interceptors wrap handler execution.

```typescript
@UseInterceptors(LoggingInterceptor)
export class AppController {
    @Get()
    @UseInterceptors(CacheInterceptor)
    public index() {}
}

class LoggingInterceptor implements Interceptor {
    async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
        console.log("Before handler");
        const result = await next();
        console.log("After handler");
        return result;
    }
}
```

### `@UsePipes(...pipes)`

There are **two distinct pipe systems**:

1. **Parameter-level pipes** (`METADATA_KEYS.PARAMETER_PIPES`):
   Applied to individual parameters via decorator arguments (see below).

2. **Route-level pipes** (`METADATA_KEYS.PIPE`):
   Applied via `@UsePipes()` at class or method level. These execute on the handler's **return value** (output transformation).

```typescript
// Route-level pipes (transforms handler output)
@UsePipes(ValidationPipe)
@Get(":id")
public getUser(@Param("id") id: string) {
    return ok({ id, name: "John" });
}

// Parameter-level pipe (validates/transforms single input)
// Applied inline via decorator options
@Get(":id")
public getUser(
    @Param("id", { pipes: [ParseIntPipe] }) id: number,
) {
    return ok({ id });
}
```

### `@UseFilters(...filters)`

Registers exception filter classes.

```typescript
@Controller()
@UseFilters(GlobalErrorFilter)
export class AppController {
    @Get()
    @UseFilters(HttpExceptionFilter)
    public index() {
        throw new BadRequestException("Invalid request");
    }
}

class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, context: ExceptionCatchContext): void {
        // Custom error handling
    }
}
```

### `@UseTransformers(...transformers)`

Registers response transformer classes. Transformers modify the handler's successful return value.

```typescript
@UseTransformers(EnvelopeTransformer)
@Controller()
export class AppController {}

class EnvelopeTransformer implements Transformer {
    transform(value: unknown, context: ExecutionContext): unknown {
        if (value === undefined) return { success: true, data: null };
        if (typeof value === "object" && value !== null && "success" in value) {
            return value; // Already has envelope
        }
        return { success: true, data: value };
    }
}
```

### `@Catch(...exceptionTypes)`

Marks a class as an exception filter. When used with `@UseFilters()`, specifies which exception types to catch.

```typescript
@Catch(HttpException)
export class HttpExceptionFilter {
    catch(exception: HttpException, context: ExceptionCatchContext) {
        // Handle only HttpException subclasses
    }
}

@Catch()  // Catch-all: handles all exceptions
export class CatchAllFilter {
    catch(exception: unknown, context: ExceptionCatchContext) {
        // Handle any exception
    }
}
```

---

## Metadata Keys

All metadata is stored using `Reflect.defineMetadata` under `METADATA_KEYS`:

| Key                    | Purpose                          |
| ---------------------- | -------------------------------- |
| `CONTROLLER`           | Controller path metadata         |
| `INJECTABLE`           | Injectable scope metadata        |
| `MODULE`               | Module configuration             |
| `PIPE`                 | Route-level pipe classes         |
| `INTERCEPTOR`          | Interceptor classes              |
| `PARAMETER_PIPES`      | Per-parameter pipe classes       |
| `GUARD`                | Guard classes                    |
| `EXCEPTION_FILTER`     | Exception filter classes         |
| `CATCH`                | Exception types for `@Catch()`   |
| `ROUTES`               | HTTP route definitions           |
| `WEBSOCKET`            | WebSocket gateway metadata       |
| `WEBSOCKET_EVENTS`     | WebSocket event handlers         |
| `CONSTRUCTOR_PARAMS`   | Constructor dependency tokens    |
| `PARAM`                | Parameter metadata array         |
| `TRANSFORM`            | Transformer classes              |
| `GLOBAL_MODULE`        | Global module flag               |
