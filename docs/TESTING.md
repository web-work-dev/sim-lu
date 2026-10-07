# Testing Guide

This guide covers the testing strategy for the `@sim-lu` framework, including unit tests, integration tests, adapter contract tests, and E2E tests.

---

## Table of Contents

1. [Testing Levels](#testing-levels)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [Adapter Contract Tests](#adapter-contract-tests)
5. [E2E Tests](#e2e-tests)
6. [Test Baseline](#test-baseline)
7. [Testing Patterns](#testing-patterns)
8. [Concurrency and Isolation Testing](#concurrency-and-isolation-testing)

---

## Testing Levels

The framework uses multiple levels of testing (AGENT.md section 27):

```text
┌─────────────────────────────────────────────────────────┐
│                    Unit Tests                            │
│  - Individual classes, executors, registries           │
│  - Fast, isolated, no I/O                              │
├─────────────────────────────────────────────────────────┤
│                 Integration Tests                        │
│  - Component combinations                              │
│  - DI + modules, execution + guards, etc.              │
├─────────────────────────────────────────────────────────┤
│         Adapter Contract Tests                          │
│  - Same semantic tests against Express + uWS           │
├─────────────────────────────────────────────────────────┤
│                  E2E Tests                               │
│  - Real HTTP/WebSocket requests                        │
│  - Complete framework path                             │
└─────────────────────────────────────────────────────────┘
```

---

## Unit Tests

### Location

```text
packages/
├── common/test/
├── core/test/      (excluding integration/)
├── error/test/
├── http/test/
├── database/test/
├── platform-express/test/   (excluding -contracts and -integration)
└── platform-uws/test/       (excluding -contracts and -integration)
```

### Examples

#### Metadata Tests (`packages/common/test/metadata.test.ts`)

```typescript
import { describe, expect, it } from "vitest";
import { METADATA_KEYS, UsePipes } from "@sim-lu/common";

describe("Metadata", () => {
    it("should store pipe metadata on method", () => {
        class MyController {
            @UsePipes(ValidationPipe)
            public handler() {}
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.PIPE,
            MyController.prototype,
            "handler",
        );

        expect(metadata).toEqual([ValidationPipe]);
    });
});
```

#### Container Tests (`packages/core/test/container.test.ts`)

```typescript
import { describe, expect, it } from "vitest";
import { Container } from "@sim-lu/core";

describe("Container", () => {
    it("should resolve class providers", async () => {
        class MyService {}

        const container = new Container();
        container.register({ token: MyService, useClass: MyService });

        const instance = await container.resolve(MyService);
        expect(instance).toBeInstanceOf(MyService);
    });
});
```

---

## Integration Tests

### Location

```text
packages/core/test/integration/
├── concurrency.test.ts
├── di-lifecycle.test.ts
├── error-logging.test.ts
├── execution-pipeline.test.ts
├── http-integration.test.ts
├── performance.test.ts
├── security.test.ts
└── websocket.test.ts
```

### Test Application Helper

The integration tests use a shared test application builder:

```typescript
// packages/core/test/integration/test-app.ts
export class TestApplicationBuilder {
    private routes: RouteConfig[] = [];
    private providers: ProviderConfig[] = [];
    
    withController(controller: Function) { ... }
    withProvider(provider: Provider) { ... }
    withGuard(guard: Function) { ... }
    withInterceptor(interceptor: Function) { ... }
    
    async build(): Promise<{ app: ApplicationContext; adapter: ExpressAdapter }> {
        const module = await createTestModule(this.providers);
        const app = await createApplication(module, new ExpressAdapter());
        return { app, adapter: app.getAdapter() as ExpressAdapter };
    }
}
```

### Execution Pipeline Ordering Test

```typescript
describe("execution pipeline order", () => {
    it("should execute interceptors → guards → handler → filters → pipes → transformers", async () => {
        const order: string[] = [];

        @UseInterceptors(OrderInterceptor)
        @UseGuards(OrderGuard)
        @UseFilters(OrderFilter)
        @UsePipes(OrderPipe)
        @UseTransformers(OrderTransformer)
        @Controller()
        class TestController {
            @Get()
            public handler() {
                order.push("handler");
                return ok({ result: "done" });
            }
        }

        const { app, adapter } = await builder
            .withController(TestController)
            .build();

        const res = await fetch(`http://127.0.0.1:${adapter.getPort()}/`);
        expect(res.status).toBe(200);
        expect(order).toEqual([
            "interceptor-before",
            "guard",
            "handler",
            "interceptor-after",
            "exception-filter",  // only if exception thrown
            "pipe",
            "transformer",
        ]);

        await app.close();
    });
});
```

### HTTP Integration Test

```typescript
describe("HTTP integration", () => {
    it("should return correct status codes", async () => {
        @Controller()
        class TestController {
            @Get("ok")
            public ok() {
                return ok({ data: "value" });  // → 200
            }

            @Get("created")
            public created() {
                return created({ id: 1 });     // → 201
            }

            @Get("no-content")
            public noContent() {
                return noContent();              // → 204
            }

            @Get("error")
            public error() {
                throw new NotFoundException("Not found");  // → 404
            }

            @Get("forbidden")
            public forbidden() {
                throw new ForbiddenException();   // → 403
            }
        }

        // ... assertions
    });
});
```

### WebSocket Integration Test

```typescript
describe("WebSocket integration", () => {
    it("should apply guards → interceptor → handler → transformer", async () => {
        const result = await adapter.dispatchWebSocket(
            "/chat",
            "$message",
            { "ws.socket": mockSocket, "ws.message": message },
        );

        expect(result).toEqual({
            success: true,
            data: { echo: message, upper: message.toUpperCase() },
        });

        expect(executionOrder).toEqual([
            "ws-interceptor-before",
            "ws-guard",
            "on-message",
            "ws-interceptor-after",
            "ws-transformer",
        ]);
    });
});
```

---

## Adapter Contract Tests

### Purpose

Run the **same semantic tests** against both Express and uWS adapters to ensure equivalent behavior.

### Location

```text
packages/platform-express/test/express-contracts.test.ts
packages/platform-uws/test/uws-contracts.test.ts
```

### Structure

```typescript
import { createContracts } from "../../core/test/contracts";

// Express contracts
createContracts({ adapter: new ExpressAdapter() });

// uWS contracts
createContracts({ adapter: new UwsAdapter() });
```

### Contract Tests Cover

| Category           | Tests                                                    |
| ------------------ | -------------------------------------------------------- |
| Routing            | GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS            |
| Path params        | `:param` extraction, multiple params, wildcards         |
| Query params       | Named and unnamed, arrays, defaults                     |
| Headers            | Request headers, response headers                      |
| Cookies            | Cookie parsing, setting, clearing                       |
| Body parsing       | JSON, URL-encoded, text, empty body                       |
| Status codes       | 200, 201, 204, 400, 401, 403, 404, 409, 500              |
| Response format    | SuccessResponse, FailureResponse envelope               |
| Error handling     | Thrown exceptions → structured error responses          |
| Request ID         | x-request-id generation and propagation                 |
| Trace ID           | x-trace-id generation and propagation                    |

---

## E2E Tests

### Location

```text
packages/core/test/integration/http-integration.test.ts
packages/core/test/integration/websocket.test.ts
```

### E2E HTTP Test Pattern

```typescript
describe("E2E: HTTP", () => {
    let app: ApplicationContext;
    let adapter: ExpressAdapter;
    let port: number;

    beforeAll(async () => {
        app = await createApplication(AppModule, new ExpressAdapter());
        adapter = app.getAdapter() as ExpressAdapter;
        await app.listen({ port: 0 });  // 0 = random free port
        port = adapter.getPort()!;
    });

    afterAll(async () => {
        await app.close();
    });

    it("should handle GET request", async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ success: true, statusCode: 200, data: { status: "ok" } });
    });
});
```

---

## Test Baseline

Per AGENT.md section 28:

```text
610 tests passing
60 test files
typecheck passing
build passing
```

This is a **baseline, not permission to weaken tests**.

### Bug Fix Workflow (AGENT.md section 37)

When fixing a bug:

1. Reproduce it with a test
2. Fix the implementation
3. Keep the regression test
4. Run the full suite

Never delete a failing test merely because the behavior is inconvenient. If a test exposes a bug, fix the underlying framework behavior.

---

## Testing Patterns

### Mock Socket for WebSocket Tests

```typescript
function createMockSocket(sent: string[]): WebSocketSocket {
    return {
        id: "mock-socket",
        send: (data: string | ArrayBuffer | Uint8Array) => {
            sent.push(typeof data === "string" ? data : Buffer.from(data).toString());
        },
        close: () => {},
        terminate: () => {},
    };
}
```

### Mock HTTP Request

```typescript
function createMockRequest(overrides: Partial<HttpRequest> = {}): HttpRequest {
    return {
        method: "GET",
        url: "/",
        headers: {},
        query: {},
        params: {},
        body: undefined,
        cookies: {},
        ip: "127.0.0.1",
        userAgent: "",
        requestId: generateRequestId(),
        traceId: generateTraceId(),
        connection: { remoteAddress: "127.0.0.1", remotePort: 0 },
        ...overrides,
    };
}
```

### Test Client

```typescript
// packages/core/test/integration/test-client.ts
export class TestHttpClient {
    constructor(private readonly baseUrl: string) {}

    async get(path: string): Promise<TestResponse> { ... }
    async post(path: string, body: unknown): Promise<TestResponse> { ... }
    async put(path: string, body: unknown): Promise<TestResponse> { ... }
    async delete(path: string): Promise<TestResponse> { ... }

    async getJson<T>(path: string): Promise<T> { ... }
}

interface TestResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
    json<T>(): T;
}
```

---

## Concurrency and Isolation Testing

### Concurrency Test Pattern (AGENT.md section 22)

```typescript
describe("concurrency", () => {
    it("should handle 100 concurrent requests", async () => {
        const promises = Array.from({ length: 100 }, (_, i) =>
            fetch(`http://127.0.0.1:${port}/api/echo/${i}`)
        );

        const results = await Promise.all(promises);
        const bodies = await Promise.all(
            results.map((res) => res.json())
        );

        expect(results.every((r) => r.status === 200)).toBe(true);
        expect(bodies.length).toBe(100);
        // Each request should get its own parameter value
        expect(bodies.every((body, i) => body.data.id === String(i))).toBe(true);
    });
});
```

### Isolation Verification

Tests must verify:

- Execution context isolation (per-request contexts don't bleed)
- Request state isolation (params, query, headers don't leak across requests)
- Parameter isolation (path params don't bleed)
- Response isolation (responses don't mix)
- Request-scoped dependency isolation
- No global mutable request state

---

## Running Tests

### Full Suite

```bash
pnpm test
```

### Per Package

```bash
cd packages/core && npx vitest run
```

### Specific File

```bash
npx vitest run packages/core/test/integration/websocket.test.ts
```

### Watch Mode

```bash
npx vitest --watch
```

### With Coverage

```bash
npx vitest run --coverage
```

### Typecheck

```bash
pnpm typecheck
```

### Build

```bash
pnpm build
```

---

## Security Testing

### Security Test Coverage (AGENT.md section 21)

| Category                  | Tests                                                  |
| ------------------------- | -------------------------------------------------------- |
| Malformed JSON            | Invalid JSON body → proper error response               |
| Path traversal            | `/../etc/passwd` → sanitized, no file access            |
| Header injection          | Newline in headers → rejected/sanitized                 |
| Unsafe error serialization | Circular references, functions in errors → safe JSON   |
| XSS-related input         | Script tags in body → preserved as data, not executed   |
| SQL injection-related     | SQL patterns in query params → treated as strings       |
| Unexpected input          | Missing required fields, wrong types → validation errors |

### Security Test Example

```typescript
describe("security", () => {
    it("should handle malformed JSON gracefully", async () => {
        const res = await fetch(`http://127.0.0.1:${port}/api/data`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{ invalid json }",
        });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.success).toBe(false);
    });
});
```
