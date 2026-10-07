# @sim-lu Examples

Example projects demonstrating how to use the `@sim-lu` framework.

## Available Examples

| Example | Package | Description |
|---|---|---|
| `express-minimal` | `@sim-lu/platform-express` + `@sim-lu/database` | Minimal HTTP server with DB plugin, parameter decorators, and user endpoints |
| `uws-minimal` | `@sim-lu/platform-uws` + `@sim-lu/database` | Minimal HTTP + WebSocket server with DB plugin |
| `full` | `@sim-lu/core` + all packages | Full-featured app with DI, guards, interceptors, transformers, exception filters, websockets, error handling, and database integration |
| `testing` | `@sim-lu/core` + `@sim-lu/platform-express` | Integration tests with `vitest`, real HTTP requests, and DB-backed tests |
| `env-config` | `@sim-lu/core` + `zod` + `@sim-lu/database` | Environment variable validation with schema-based config and database |
| `http-kernel` | `@sim-lu/core` + `@sim-lu/database` | HTTP server using Node's built-in `http` module with DB integration |

## Running an Example

Each example is a workspace package. From the example directory:

```bash
cd examples/express-minimal
pnpm start   # build + run
pnpm build   # typecheck + compile
```

You can use `pnpm start` to compile and run, or `pnpm dev` for watch mode.
The framework loads `reflect-metadata` internally, so application code does
not import it. Constructor injection works from TypeScript types or, when
those are missing, from constructor parameter names.

## Quick Start: Express Minimal

```bash
cd examples/express-minimal
pnpm start
# → listening on http://127.0.0.1:3000
```

## Database Plugin

All examples use the `@sim-lu/database` plugin system via `DatabasePlugin.forRoot({})`.
This demonstrates the plugin registration pattern:

```ts
import { DatabasePlugin } from "@sim-lu/database";
import { createApplication } from "@sim-lu/core";

const app = await createApplication(AppModule, adapter, {
    plugins: [DatabasePlugin.forRoot({})],
});
```

The `DatabasePlugin` provides:
- A `MemoryDatabaseAdapter` by default (no external dependencies)
- A `DatabaseService` registered as a global provider
- `DATABASE` and `DATABASE_OPTIONS` tokens for direct adapter access

Inject `DatabaseService` into any controller or service:

```ts
@Controller("items")
class ItemsController {
    constructor(private readonly db: DatabaseService) {}

    @Get()
    async list() {
        const items = await this.db.find<Item>("items");
        return ok(items);
    }
}
```

## Quick Start: Full Example

```bash
cd examples/full
pnpm start
# → listening on http://127.0.0.1:3000
```

This example demonstrates:

- **Modules** — `@Module` with imports, controllers, and providers
- **Dependency Injection** — `@Injectable()` services injected into controllers via constructor
- **Controllers** — `@Controller` with `@Get`, `@Post`, `@Put`, `@Delete` routes
- **Parameter Decorators** — `@Param`, `@Query`, `@Body`, `@Headers` from `@sim-lu/common`
- **Guards** — `@UseGuards(ApiKeyGuard)` for API key authentication
- **Interceptors** — `@UseInterceptors(LoggingInterceptor)` from `@sim-lu/common`
- **Transformers** — `@UseTransformers(EnvelopeTransformer)` to wrap responses in `{ success, data }`
- **Exception Filters** — `@UseFilters(ValidationExceptionFilter)` for custom `BadRequestException` handling
- **Pipes** — `@UsePipes()` decorator available in `@sim-lu/common`
- **WebSocket Gateway** — `@WebSocket` with `@OnOpen`, `@OnMessage`, `@OnClose`
- **Error Handling** — `ok()`, `created()`, `noContent()`, `fail()`, `NotFoundException`, `BadRequestException`
- **Lifecycle Hooks** — `OnModuleInit`, `OnApplicationBootstrap`, `OnModuleDestroy`
- **Database Plugin** — `DatabasePlugin.forRoot({})` for in-memory database access

## API Reference

### Endpoints

```
GET  /health            → { success: true, data: { status: "ok" } }
GET  /health/uptime     → { success: true, data: { uptime: <ms> } }

GET  /todos             → list all todos (requires x-api-key: secret-key)
POST /todos             → create a todo: { title: "Buy milk" }
GET  /todos/:id         → get a todo by id
PUT  /todos/:id         → update a todo: { title: "...", completed: true }
POST /todos/:id/complete → mark todo as complete
DELETE /todos/:id        → delete a todo

GET  /secure/todos      → same as /todos but explicitly guard-protected
...    (same CRUD routes)

WS   /ws/chat           → WebSocket chat gateway
```

### Testing the API

```bash
# Create a todo
curl -X POST http://127.0.0.1:3000/todos \
  -H "Content-Type: application/json" \
  -H "x-api-key: secret-key" \
  -d '{"title": "Buy milk"}'

# List todos
curl http://127.0.0.1:3000/todos \
  -H "x-api-key: secret-key"

# Get a single todo
curl http://127.0.0.1:3000/todos/1 \
  -H "x-api-key: secret-key"

# Delete a todo
curl -X DELETE http://127.0.0.1:3000/todos/1 \
  -H "x-api-key: secret-key"
```

## Testing Example

A dedicated testing example demonstrating integration testing with `vitest`:

```bash
cd examples/testing
pnpm test
```

This example shows how to:
- Start an application with `createApplication()` on a random port
- Use `vitest` `beforeAll`/`afterAll` for setup/teardown
- Make real HTTP requests using `fetch`
- Assert response status, body shape, and data content
- Test parameter decorators (`@Param`, `@Query`, `@Headers`, `@Body`)
- Test database-backed CRUD operations with `DatabaseService`

## Environment Config Example

A pattern for schema-validated environment variables using `zod`:

```bash
cd examples/env-config
DATABASE_URL=postgresql://user:pass@localhost:5432/db NODE_ENV=production pnpm start
```

This example shows how to:
- Define an environment schema with `zod`
- Use `OnModuleInit` to load and validate environment variables at startup
- Access config via an `@Injectable()` `ConfigService`
- Expose config through HTTP endpoints
- Use the `DatabasePlugin` for DB connection status

## HTTP Kernel Example (No Express Required)

Run an HTTP server using only Node.js built-in `http` module by extending
`NodeHttpKernel` directly:

```bash
cd examples/http-kernel
pnpm start
# → listening on http://127.0.0.1:3000
```

This example demonstrates:
- Extending `NodeHttpKernel` for a zero-dependency HTTP server
- Using `@Param`, `@Query`, and `@Body` parameter decorators
- Database integration with `DatabasePlugin` and `DatabaseService`
- Returning JSON responses with `ok()` and `created()`
- Error handling with `fail()` and `HttpStatus`

### Endpoints

```
GET  /api/status            → { success: true, data: { status, uptime } }
GET  /api/echo/:message?repeat=3 → { success: true, data: { echoed, repeat } }
POST /api/calculate         → { success: true, data: { result } }
POST /api/books             → { success: true, statusCode: 201, data: Book }
GET  /api/books             → { success: true, data: Book[] }
GET  /api/error             → { success: false, statusCode: 500, ... }
```
