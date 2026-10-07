# WebSockets Guide

This guide covers the WebSocket support in `@sim-lu`, including gateways, event handlers, parameter decorators, and integration with the execution pipeline.

---

## Table of Contents

1. [Creating a Gateway](#creating-a-gateway)
2. [Event Handlers](#event-handlers)
3. [WebSocket Parameters](#websocket-parameters)
4. [Execution Pipeline Integration](#execution-pipeline-integration)
5. [Dispatching Events](#dispatching-events)
6. [Adapter Registration](#adapter-registration)
7. [Known Issues](#known-issues)

---

## Creating a Gateway

A WebSocket gateway is a class decorated with `@WebSocket(path)`:

```typescript
import { WebSocket, OnOpen, OnMessage, OnClose, On, UseGuards } from "@sim-lu/core";
import type { WebSocketSocket } from "@sim-lu/http";

@WebSocket("chat")
export class ChatGateway {
    @OnOpen()
    public onOpen(@WsSocket() socket: WebSocketSocket) {
        socket.send(JSON.stringify({ type: "welcome" }));
    }

    @OnMessage()
    public onMessage(
        @WsSocket() socket: WebSocketSocket,
        @WsMessage() message: string,
    ) {
        socket.send(message);  // Echo back
    }

    @OnClose()
    public onClose(@WsSocket() socket: WebSocketSocket) {
        console.log("Connection closed");
    }

    @On("join")
    public onJoin(
        @WsSocket() socket: WebSocketSocket,
        @WsMessage() data: string,
    ) {
        // Handle custom "join" event
    }
}
```

### Multiple Gateways

Multiple gateways can share the same path:

```typescript
@WebSocket("notifications")
export class NotificationGateway {
    @OnMessage()
    public onMessage(@WsSocket() socket: WebSocketSocket, @WsMessage() msg: string) {}
}

@WebSocket("notifications")
export class AlertGateway {
    @On("alert")
    public onAlert(@WsSocket() socket: WebSocketSocket) {}
}
```

Both gateways will be grouped under the `/notifications` path.

---

## Event Handlers

### Built-in Events

| Decorator  | Event Name  | Trigger                    |
| ---------- | ----------- | -------------------------- |
| `@OnOpen()`    | `"$open"`   | WebSocket connection opened |
| `@OnMessage()` | `"$message"`| Message received           |
| `@OnClose()`   | `"$close"`  | Connection closed          |

### Custom Events

Use `@On(event)` for custom events:

```typescript
@On("subscribe")
public onSubscribe(@WsMessage() data: string) {
    // Handle "subscribe" event
}

@On("unsubscribe")
public onUnsubscribe(@WsMessage() data: string) {
    // Handle "unsubscribe" event
}
```

---

## WebSocket Parameters

WebSocket parameter decorators resolve context state:

| Decorator       | Parameter Type  | Context Key      | Source                      |
| --------------- | --------------- | ---------------- | --------------------------- |
| `@WsSocket()`   | `ws-socket`     | `"ws.socket"`    | WebSocket socket object     |
| `@WsMessage()`  | `ws-message`    | `"ws.message"`   | Message data string         |
| `@WsContext()`  | `ws-context`    | `"ws.context"`   | **⚠ Returns undefined**     |
| `@Ctx()`        | `context`       | —                | Returns `ExecutionContext`  |

### ⚠ Known Issue: `@WsContext()` Returns Undefined

The `@WsContext()` decorator resolves `context.get("ws.context")`, but **no platform adapter sets the `ws.context` state key**. This means `@WsContext()` always returns `undefined`.

**Workaround:** Use `@Ctx()` which returns the `ExecutionContext` directly:

```typescript
@OnMessage()
public handler(
    @Ctx() ctx: ExecutionContext,  // ✅ Works
    @WsMessage() message: string,
) {
    // ctx has access to request, response, params, etc.
}
```

**Recommended Fix:** Either:
1. Change `ws-context` to return the `ExecutionContext` (same as `context` type), or
2. Have platform adapters set `ws.context` in the WebSocket state object

---

## Execution Pipeline Integration

WebSocket handlers go through the **same execution pipeline** as HTTP handlers. All cross-cutting concerns apply:

```text
┌─────────────────────────────────────────────────────────────┐
│              WebSocket Event Dispatch                        │
│                                                              │
│  adapter.dispatchWebSocket(path, event, state)               │
│      → RequestExecutor.executeWebSocket(route, state)        │
│          → ExecutionDispatcher.execute(handler, context)     │
│              → ExecutionEngine.execute(handler, context)     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      ExecutionEngine                         │
│                                                              │
│  try:                                                       │
│    InterceptorExecutor  ← before/after hooks                 │
│    GuardExecutor        ← canActivate, throws Forbidden      │
│    ExecutionRunner      ← parameter resolution + handler     │
│    catch:                                                      │
│    ExceptionFilterExecutor ← @Catch / DefaultExceptionFilter │
│                                                             │
│  PipeExecutor         ← route-level @UsePipes on result       │
│  TransformerExecutor  ← @UseTransformers on result            │
└─────────────────────────────────────────────────────────────┘
```

### Guards on Gateways

```typescript
@WebSocket("secure")
@UseGuards(WsAuthGuard)
export class SecureGateway {
    @OnMessage()
    public handler(@WsMessage() message: string) {}
}

class WsAuthGuard implements Guard {
    canActivate(context: GuardContext): boolean {
        const socket = context.get<WebSocketSocket>("ws.socket");
        // Verify socket authentication
        return this.isSocketAuthorized(socket);
    }
}
```

If a guard returns `false`, `ForbiddenException` is thrown (HTTP 403 equivalent for WebSocket).

### Interceptors on Gateways

```typescript
@WebSocket("chat")
@UseInterceptors(TimingInterceptor)
export class ChatGateway {
    @OnMessage()
    @UseInterceptors(LoggingInterceptor)
    public handler(@WsMessage() message: string) {}
}
```

### Exception Filters on Gateways

```typescript
@WebSocket("chat")
@UseFilters(WsExceptionFilter)
export class ChatGateway {
    @OnMessage()
    public handler(@WsMessage() message: string) {
        throw new BadRequestException("Invalid message");
    }
}
```

Exception filters on WebSocket handlers return `FailureResponse` objects (they cannot send HTTP responses, since there is none). The return value goes through pipes and transformers.

### Transformers on Gateways

```typescript
@WebSocket("chat")
@UseTransformers(EnvelopeTransformer)
export class ChatGateway {
    @OnMessage()
    public handler(@WsMessage() message: string) {
        return { received: message };  // Transformed into envelope
    }
}
```

---

## Dispatching Events

The platform adapters register WebSocket handlers that are dispatched via `NodeHttpKernel.dispatchWebSocket()`:

```typescript
// Platform adapter dispatches an event
await adapter.dispatchWebSocket(path, event, state);
```

The `state` object contains context that will be set in `ExecutionContext`:

```typescript
interface WebSocketState {
    "ws.socket": WebSocketSocket;
    "ws.message": string;
    // Future: "ws.context" could hold WebSocketContext
}
```

### Manual Dispatch (Testing)

```typescript
// From tests or programmatic invocation
const result = await adapter.dispatchWebSocket("/chat", "$message", {
    "ws.socket": mockSocket,
    "ws.message": JSON.stringify({ type: "msg", data: "hello" }),
});
```

---

## Adapter Registration

### Express Adapter

The Express adapter registers WebSocket handlers via the `ws` library:

```typescript
// In ApplicationContext.bindAdapter()
if (adapter.registerWebSocket) {
    const groups = new Map<string, WebSocketRouteDefinition[]>();
    
    for (const route of this.getWebSocketRoutes()) {
        const current = groups.get(route.path) ?? [];
        current.push(route);
        groups.set(route.path, current);
    }

    for (const [path, routes] of groups) {
        adapter.registerWebSocket(path, routes, (route, state) =>
            executor.executeWebSocket(route, state),
        );
    }
}
```

### uWS Adapter

The uWS adapter registers WebSocket handlers via native uWS `app.ws()`:

```typescript
// uws-adapter.ts
app.ws(
    path,
    {
        message: (socket, message, isLast) => {
            // Extract message, call handler via dispatchWebSocket
        },
        open: (socket) => {
            // Call $open handler
        },
        close: (socket) => {
            // Call $close handler
        },
    },
);
```

### NodeHttpKernel Fallback

The `NodeHttpKernel` provides `dispatchWebSocket()` for manual/test dispatch:

```typescript
public async dispatchWebSocket(
    path: string,
    event: string,
    state: Readonly<Record<string, unknown>> = {},
): Promise<unknown> {
    const handler = this.websocketHandlers.get(path);
    const route = this.websocketRoutes.get(path)?.find(
        (item) => item.event === event,
    );

    if (!handler || !route) {
        throw new Error(`WebSocket route not found: ${path} ${event}`);
    }

    return handler(route, state);
}
```

---

## Known Issues

1. **`@WsContext()` returns `undefined`** — No adapter sets the `ws.context` state key. Use `@Ctx()` instead.

2. **No WebSocket-specific response sending** — WebSocket handlers can use `@WsSocket()` to call `socket.send()`, but the framework doesn't intercept this. Return values go through the full pipeline (pipes, transformers), but for WebSocket there's no HTTP response to send the result to.

3. **Error responses from WebSocket handlers** — When a handler throws and `DefaultExceptionFilter` catches it, the error is returned as a `FailureResponse` object but is not sent over the WebSocket connection. Custom filters must handle sending error messages via the socket.
