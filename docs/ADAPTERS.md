# Adapters Guide

This guide covers the HTTP adapter system in `@sim-lu/core`, including the `HttpAdapter` interface, `NodeHttpKernel` base class, and platform-specific adapters for Express and uWebSockets.js.

---

## Table of Contents

1. [Adapter Architecture](#adapter-architecture)
2. [HttpAdapter Interface](#httpadapter-interface)
3. [NodeHttpKernel](#nodehttpkernel)
4. [ExpressAdapter](#expressadapter)
5. [UwsAdapter](#uwsadapter)
6. [Request/Response Mapping](#requestresponse-mapping)
7. [Status Code Propagation](#status-code-propagation)
8. [Error Handling in Adapters](#error-handling-in-adapters)
9. [WebSocket Registration](#websocket-registration)
10. [Known Inconsistencies](#known-inconsistencies)

---

## Adapter Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                   HttpAdapter (interface)               │
│                   adapter/http-adapter.ts                │
│                                                         │
│   registerHttp(route, handler)                          │
│   registerWebSocket?(path, routes, handler)              │
│   listen(options)                                       │
│   close()                                               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  NodeHttpKernel (abstract)               │
│                  adapter/node-http-kernel.ts              │
│                                                         │
│   - Creates Node.js HTTP server                         │
│   - Route matching via matchPath()                      │
│   - Path parameter extraction                           │
│   - Base implementation of HttpAdapter                 │
│   - handle() method for fallback routing                │
└──────────┬──────────────────────────────────────────────┘
           │
           ├──────────────────────────────┐
           ▼                              ▼
┌────────────────────┐       ┌──────────────────────┐
│ ExpressAdapter      │       │ UwsAdapter           │
│ platform-express    │       │ platform-uws         │
│                     │       │                      │
│ - Extends NodeHttp  │       │ - Extends NodeHttp   │
│ - Uses Express router│       │ - Uses native uWS    │
│ - Express body parser│       │ - Falls back to      │
│ - Express 404/error  │       │   NodeHttpKernel     │
│   middleware         │       │ - Native uWS 404/    │
│                      │       │   error handling     │
└────────────────────┘       └──────────────────────┘
```

---

## HttpAdapter Interface

```typescript
export interface HttpAdapter {
    readonly name: string;

    registerHttp(
        route: HttpRouteDefinition,
        handler: AdapterHttpHandler,
    ): void;

    registerWebSocket?(
        path: string,
        routes: readonly WebSocketRouteDefinition[],
        handler: AdapterWebSocketHandler,
    ): void;

    listen(options: ListenOptions): Promise<void>;
    close(): Promise<void>;
}
```

### Handler Types

```typescript
type AdapterHttpHandler = (
    request: HttpRequest,
    response: MutableHttpResponse,
) => Promise<unknown>;

type AdapterWebSocketHandler = (
    route: WebSocketRouteDefinition,
    state: Readonly<Record<string, unknown>>,
) => Promise<unknown>;
```

---

## NodeHttpKernel

The `NodeHttpKernel` provides a base implementation for HTTP adapters that use Node.js's built-in `http` module as a fallback.

### Key Methods

| Method                  | Visibility  | Description                          |
| ----------------------- | ----------- | ------------------------------------ |
| `registerHttp()`        | public      | Stores route + handler               |
| `registerWebSocket()`   | public      | Stores WebSocket route + handler     |
| `listen()`              | public      | Creates `http.createServer()`        |
| `close()`               | public      | Closes the server                    |
| `handle()`              | protected   | Route matching + handler invocation  |
| `match()`               | protected   | Route matching with specificity     |
| `toRequest()`           | protected   | Converts `IncomingMessage` to `HttpRequest` |
| `readBody()`            | protected   | Reads request body                   |
| `write()`               | protected   | Serializes `MutableHttpResponse`    |
| `dispatchWebSocket()`   | public      | Dispatches WebSocket events         |
| `handleRequest()`       | public      | Public wrapper for `handle()`       |

### Route Matching

```typescript
protected match(method: string, pathname: string): { handler, params } | undefined {
    // 1. Exact match: route.path === pathname → return immediately
    // 2. Pattern match: matchPath(route.path, pathname)
    //    → uses pathSpecificity() to score specificity
    // 3. Return highest-scoring match, or undefined if no match
}
```

**Specificity scoring:**
- Static segment (`/users`): +100
- Parameter segment (`/users/:id`): +10
- Wildcard (`/users/*`): +1

---

## ExpressAdapter

### Registration

```typescript
import { ExpressAdapter } from "@sim-lu/platform-express";

const adapter = new ExpressAdapter({
    error: { console: false, includeDetails: true },
});

const app = await createApplication(AppModule, adapter);
await app.listen({ port: 3000 });
```

### Express Routes

Routes are registered with Express's native router:

```typescript
private bindExpressRoutes(app: Express): void {
    for (const entry of this.httpRoutes) {
        const method = METHOD_MAP[entry.route.method];  // get, post, put, ...
        app[method](this.toExpressPath(entry.route.path), (req, res, next) => {
            // 1. Extract/generate requestId + traceId
            // 2. Create HttpRequest via toHttpRequest()
            // 3. Create MutableHttpResponse
            // 4. Call entry.handler(request, writer) → RequestExecutor.executeHttp()
            // 5. writeExpress(response, writer) → serialize + send
        });
    }

    // 404 handler
    app.use((req, res) => {
        writeSerialized(res, notFoundBody(errorHandler, snapshotRequest(...)));
    });

    // Error handler (Express error middleware)
    app.use((exception, req, res, _next) => {
        writeSerialized(res, handleAdapterError(errorHandler, exception, snapshotRequest(...)));
    });
}
```

### Request Conversion

```typescript
private toHttpRequest(request: Request, requestId: string, traceId: string): HttpRequest {
    return {
        method: request.method.toUpperCase(),
        url: request.path,
        headers: request.headers,
        query: this.normalizeDict(request.query),
        params: this.normalizeDict(request.params),
        body: request.body,
        cookies: parseCookies(request.headers.cookie),
        ip: request.ip ?? request.socket.remoteAddress ?? "",
        userAgent: request.headers["user-agent"] ?? "",
        requestId,
        traceId,
        connection: {
            remoteAddress: remoteAddress,
            remotePort: request.socket.remotePort ?? 0,
        },
    };
}
```

### Response Serialization

```typescript
private writeExpress(response: Response, writer: MutableHttpResponse): void {
    const serialized = serializeBody(writer.body);
    response.status(writer.status);
    
    for (const [name, value] of Object.entries(writer.headers)) {
        if (value !== undefined) {
            response.setHeader(name, value);
        }
    }
    
    if (serialized.contentType && !response.getHeader("content-type")) {
        response.setHeader("content-type", serialized.contentType);
    }
    
    response.send(serialized.payload);
}
```

---

## UwsAdapter

### Registration

```typescript
import { UwsAdapter } from "@sim-lu/platform-uws";

const adapter = new UwsAdapter({
    error: { console: false },
});

const app = await createApplication(AppModule, adapter);
await app.listen({ port: 3000 });
```

### Fallback Behavior

If uWebSockets.js is unavailable, `UwsAdapter.listen()` falls back to `NodeHttpKernel.listen()`:

```typescript
public override async listen(options: ListenOptions): Promise<void> {
    const uws = await this.loadUws();
    
    if (!uws) {
        await super.listen(options);  // Node.js fallback
        return;
    }
    
    // Use native uWS
    this.uwsApp = uws.App();
    this.bindUwsRoutes(this.uwsApp);
    await new Promise((resolve, reject) => {
        this.uwsApp.listen(options.host, options.port, (token) => {
            if (!token) reject(new Error("Failed to bind"));
            this.listenSocket = token;
            resolve();
        });
    });
}
```

### Native uWS Routes

When uWS is available, routes are registered natively:

```typescript
private bindUwsRoutes(app: UwsTemplatedApp): void {
    for (const entry of this.httpRoutes) {
        const method = METHOD_MAP[entry.route.method];
        app[method](this.toUwsPath(entry.route.path), (res, req) => {
            void this.dispatchUws(entry.handler, req, res);
        });
    }

    // 404 catch-all
    app.any("/*", (res, req) => {
        writeSerializedUws(res, notFoundBody(errorHandler, snapshotRequest(...)));
    });
}
```

### Native uWS Path Parameters

When uWS handles routing, path parameters are extracted via `request.getParams()`:

```typescript
private async toHttpRequest(request: UwsHttpRequest, ...): Promise<HttpRequest> {
    return {
        // ...
        params: request.getParams(),  // Native uWS extraction
        // ...
    };
}
```

### Error Handling

```typescript
private async dispatchUws(handler, request, response): Promise<void> {
    const writer = new MutableHttpResponse();
    
    try {
        const httpRequest = await this.toHttpRequest(request, response, ...);
        await handler(httpRequest, writer);
        if (!aborted) {
            this.writeUws(response, writer);
        }
    } catch (exception) {
        if (!aborted) {
            this.writeSerializedUws(
                response,
                handleAdapterError(errorHandler, exception, requestSnapshot),
            );
        }
    }
}
```

---

## Request/Response Mapping

### HttpRequest Interface

```typescript
interface HttpRequest {
    method: string;                     // "GET", "POST", etc.
    url: string;                        // Path without query string
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string | string[] | undefined>;
    params: Record<string, string | string[] | undefined>;
    body: unknown;                      // Parsed body (JSON or raw)
    cookies: Record<string, string | undefined>;
    ip: string;
    userAgent: string;
    requestId?: string;                // From x-request-id header
    traceId?: string;                   // From x-trace-id header
    connection: {
        remoteAddress: string;
        remotePort: number;
    };
}
```

### MutableHttpResponse

```typescript
class MutableHttpResponse implements HttpResponse {
    // Properties
    get status(): number;          // Default: 200
    get body(): unknown;           // Default: undefined
    get headers(): Record<string, string | string[] | undefined>;
    get cookies(): Record<string, string | undefined>;
    
    // Methods
    setStatus(status: number): this;
    setHeader(name: string, value: string | string[]): this;
    send(body: unknown): this;
    setCookie(name: string, value: string, _options?: CookieOptions): void;
    clearCookie(name: string, _options?: CookieOptions): void;
}
```

---

## Status Code Propagation

Status codes from handler results are propagated to the HTTP response:

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

### Status Code Flow Example

```typescript
@Get()
public handler(): SuccessResponse<unknown> {
    return created({ id: 1 });  // statusCode: 201
}

// 1. Handler returns { success: true, statusCode: 201, data: { id: 1 } }
// 2. RequestExecutor reads result.statusCode (201)
// 3. MutableHttpResponse.setStatus(201)
// 4. Adapter sends 201 Created
```

---

## Error Handling in Adapters

### Express Error Handling

```text
Exception thrown during handler
    ↓
try { handler(request, writer) } catch { next(exception) }
    ↓
Express error-handling middleware (4th arg function):
    (exception, request, response, next) => {
        writeSerialized(
            response,
            handleAdapterError(
                errorHandler,
                exception,
                snapshotRequest({ method, url, ip, userAgent, requestId, traceId })
            )
        );
    }
```

### uWS Error Handling

```text
Exception thrown during handler in dispatchUws()
    ↓
catch (exception) {
    if (!aborted) {
        writeSerializedUws(
            response,
            handleAdapterError(
                errorHandler,
                exception,
                requestSnapshot
            )
        );
    }
}
```

### 404 Handling

- **Express**: Falls through to `app.use((req, res) => ...)` middleware
- **uWS native**: `app.any("/*", ...)` catch-all route
- **Node.js fallback**: `NodeHttpKernel.handle()` sends plain text `"Not Found"` with status 404

---

## WebSocket Registration

### Gateway Discovery

```text
ApplicationContext.init()
    → RouteRegistry.exploreModules()
        → RouteExplorer.exploreWebSocket(controller)
            → Reads @WebSocket() metadata
            → Reads @OnOpen / @OnMessage / @OnClose / @On() events
            → Creates WebSocketRouteDefinition[]

ApplicationContext.listen()
    → bindAdapter()
        → Groups routes by path
        → adapter.registerWebSocket(path, routes, handler)
            → handler = (route, state) => executor.executeWebSocket(route, state)
```

### Dispatch Flow

```text
Platform adapter receives WebSocket event
    ↓
adapter.dispatchWebSocket(path, event, state)
    ↓
NodeHttpKernel.dispatchWebSocket()
    → Looks up websocketHandlers.get(path)
    → Looks up websocketRoutes.get(path)?.find(item => item.event === event)
    → Calls handler(route, state)
        ↓
        RequestExecutor.executeWebSocket(route, state)
            → Creates ExecutionContext with transport="websocket"
            → Sets all state entries as context values
            → Calls ExecutionDispatcher.execute() → ExecutionEngine.execute()
```

---

## Known Inconsistencies

### 1. NodeHttpKernel Plain Text Error Responses (P1)

```text
NodeHttpKernel.handle() vs Platform Adapters:

┌──────────────────┬────────────────────┬─────────────────────────┐
│ Scenario         │ NodeHttpKernel      │ Express / uWS native     │
├──────────────────┼────────────────────┼─────────────────────────┤
│ 404              │ Plain text "Not    │ JSON via notFoundBody() │
│                  │ Found" (status 404)│                         │
├──────────────────┼────────────────────┼─────────────────────────┤
│ 500 Exception    │ Plain text "Internal│ JSON via              │
│                  │ Server Error"      │ handleAdapterError()    │
│                  │ (status 500)        │                         │
└──────────────────┴────────────────────┴─────────────────────────┘
```

**Impact**: Only affects apps using `NodeHttpKernel.handleRequest()` directly without overriding `handle()`. ExpressAdapter and UwsAdapter override this behavior with structured JSON responses.

### 2. Duplicated Serialization Logic (P2)

```text
@sim-lu/error/src/adapter.ts
    └── applySerializedBody()  ← serializes to WritableHttpResponse

platform-express/src/express-adapter.ts
    └── writeSerialized()      ← duplicates serialization logic

platform-uws/src/uws-adapter.ts
    └── writeSerializedUws()   ← duplicates serialization logic
```

The `applySerializedBody()` function in `@sim-lu/error` is used only by `DefaultExceptionFilter` and is not shared with platform adapters.

### 3. uWS WebSocket Registration Not Explicitly Wired

The `UwsAdapter` overrides `handle()` for HTTP but its `UwsTemplatedApp` type definition does not include `.ws()` for WebSocket registration. The `NodeHttpKernel.registerWebSocket()` method stores routes, but uWS native WebSocket support requires calling `app.ws()` directly.
