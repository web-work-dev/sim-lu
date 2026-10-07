import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import {
    Controller,
    Get,
    Module,
    Param,
    Query,
    WebSocket,
    On,
    OnOpen,
    OnMessage,
    OnClose,
    WsSocket,
    WsMessage,
    WsContext,
    Ctx,
    UseGuards,
    UseInterceptors,
    UseFilters,
    UseTransformers,
    createApplication,
    type ApplicationContext,
    type Guard,
    type GuardContext,
    type Interceptor,
    type ExecutionContext as CoreExecutionContext,
    type ExceptionFilter,
    type Transformer,
    type WebSocketSocket,
    type WebSocketContext,
} from "@sim-lu/core";
import {
    ok,
    type SuccessResponse,
} from "@sim-lu/error";
import { ExpressAdapter } from "@sim-lu/platform-express";

let executionOrder: string[] = [];

class WsPassGuard implements Guard {
    public canActivate(_context: GuardContext): boolean {
        executionOrder.push("ws-guard");
        return true;
    }
}

class WsInterceptor implements Interceptor {
    public async intercept(
        _context: CoreExecutionContext,
        next: () => unknown | Promise<unknown>,
    ): Promise<unknown> {
        executionOrder.push("ws-interceptor-before");
        const result = await next();
        executionOrder.push("ws-interceptor-after");
        return result;
    }
}

class WsTransformer implements Transformer {
    public transform(value: unknown): unknown {
        executionOrder.push("ws-transformer");

        if (value === undefined || value === null) {
            return { success: true, data: null };
        }

        if (typeof value === "object" && value !== null && "success" in value) {
            return value;
        }

        return { success: true, data: value };
    }
}

@Controller("ws-http")
class WsHttpController {
    @Get("/health")
    public health(): SuccessResponse<{ status: string }> {
        return ok({ status: "ok" });
    }
}

@WebSocket("/chat")
@UseGuards(WsPassGuard)
@UseInterceptors(WsInterceptor)
@UseTransformers(WsTransformer)
class ChatGateway {
    @OnOpen()
    public onOpen(
        @WsSocket() socket: WebSocketSocket,
    ): SuccessResponse<{ connected: boolean }> {
        executionOrder.push("on-open");

        socket.send(JSON.stringify({ type: "welcome" }));

        return ok({ connected: true });
    }

    @OnMessage()
    public onMessage(
        @WsSocket() _socket: WebSocketSocket,
        @WsMessage() message: string,
    ): SuccessResponse<{ echo: string; upper: string }> {
        executionOrder.push("on-message");

        const parsed = JSON.parse(message) as { type: string; data?: string };

        return ok({
            echo: message,
            upper: parsed.data
                ? parsed.data.toUpperCase()
                : message.toUpperCase(),
        });
    }

    @On("broadcast")
    public onBroadcast(
        @Ctx() context: CoreExecutionContext,
    ): SuccessResponse<{ broadcast: boolean }> {
        executionOrder.push("on-broadcast");
        const socket = context.get<WebSocketSocket>("ws.socket");
        socket?.send(JSON.stringify({ type: "broadcast" }));
        return ok({ broadcast: true });
    }

    @On("ctx-test")
    public onCtxTest(
        @WsContext() wsContext: WebSocketContext,
    ): SuccessResponse<{ socketId: string; hasState: boolean }> {
        executionOrder.push("on-ctx-test");
        return ok({
            socketId: wsContext.socket.id,
            hasState: wsContext.state instanceof Map,
        });
    }

    @OnClose()
    public onClose(
        @WsSocket() _socket: WebSocketSocket,
    ): SuccessResponse<{ closed: boolean }> {
        executionOrder.push("on-close");
        return ok({ closed: true });
    }
}

class ErrorFilter implements ExceptionFilter {
    public catch(exception: unknown): unknown {
        executionOrder.push("ws-error-filter");

        if (exception instanceof Error) {
            return {
                success: false,
                statusCode: 500,
                message: `Caught: ${exception.message}`,
            };
        }

        throw exception;
    }
}

@WebSocket("/errors")
@UseFilters(ErrorFilter)
class ErrorGateway {
    @OnMessage()
    public onMessage(): never {
        throw new Error("WS error test");
    }
}

@Controller("ws-simple")
class SimpleController {
    @Get("/ping")
    public ping(): SuccessResponse<{ pong: boolean }> {
        return ok({ pong: true });
    }

    @Get("/:id")
    public find(@Param("id") id: string): SuccessResponse<{ id: string }> {
        return ok({ id });
    }
}

const createMockSocket = (sent: string[]): WebSocketSocket => ({
    send: (data: unknown) => { sent.push(data as string); },
    close: () => {},
    terminate: () => {},
});

@Module({
    controllers: [WsHttpController, ChatGateway, ErrorGateway, SimpleController],
    providers: [WsPassGuard, WsInterceptor, WsTransformer, ErrorFilter],
})
class WsTestModule {}

describe("WebSocket Integration", () => {
    let app: ApplicationContext;
    let adapter: ExpressAdapter;
    let port: number;

    beforeAll(async () => {
        adapter = new ExpressAdapter({
            error: { console: false },
        });
        app = await createApplication(WsTestModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });
        port = adapter.getPort() as number;
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        executionOrder = [];
    });

    describe("websocket route registration", () => {
        it("should register WebSocket paths", () => {
            expect(adapter.getRegisteredWebSocketPaths()).toContain("/chat");
            expect(adapter.getRegisteredWebSocketPaths()).toContain("/errors");
        });

        it("should also register HTTP routes", () => {
            const httpRoutes = adapter.getRegisteredHttpRoutes();
            const paths = httpRoutes.map((r) => r.path);
            expect(paths).toContain("/ws-http/health");
            expect(paths).toContain("/ws-simple/ping");
            expect(paths).toContain("/ws-simple/:id");
        });
    });

    describe("websocket handler dispatch", () => {
        it("should dispatch OnOpen handler with socket", async () => {
            const sent: string[] = [];
            const mockSocket = createMockSocket(sent);

            const result = await adapter.dispatchWebSocket(
                "/chat",
                "$open",
                { "ws.socket": mockSocket },
            ) as { success: boolean; data: { connected: boolean } };

            expect(result.success).toBe(true);
            expect(result.data.connected).toBe(true);
            expect(sent.length).toBeGreaterThan(0);
        });

        it("should dispatch OnMessage handler with message parameter", async () => {
            const sent: string[] = [];
            const mockSocket = createMockSocket(sent);
            const message = JSON.stringify({ type: "msg", data: "hello world" });

            const result = await adapter.dispatchWebSocket(
                "/chat",
                "$message",
                { "ws.socket": mockSocket, "ws.message": message },
            ) as { success: boolean; data: { echo: string; upper: string } };

            expect(result.success).toBe(true);
            expect(result.data.echo).toBe(message);
            expect(result.data.upper).toBe("HELLO WORLD");
        });

        it("should dispatch On('broadcast') handler via context", async () => {
            const sent: string[] = [];
            const mockSocket = createMockSocket(sent);

            const result = await adapter.dispatchWebSocket(
                "/chat",
                "broadcast",
                { "ws.socket": mockSocket },
            ) as { success: boolean; data: { broadcast: boolean } };

            expect(result.success).toBe(true);
            expect(result.data.broadcast).toBe(true);
            expect(sent.length).toBeGreaterThan(0);
        });

        it("should dispatch OnClose handler", async () => {
            const sent: string[] = [];
            const mockSocket = createMockSocket(sent);

            const result = await adapter.dispatchWebSocket(
                "/chat",
                "$close",
                { "ws.socket": mockSocket },
            ) as { success: boolean; data: { closed: boolean } };

            expect(result.success).toBe(true);
            expect(result.data.closed).toBe(true);
        });

        it("should throw for unknown WebSocket path", async () => {
            await expect(
                adapter.dispatchWebSocket("/unknown", "$message", {}),
            ).rejects.toThrow("WebSocket route not found");
        });

        it("should throw for unknown WebSocket event", async () => {
            const mockSocket = createMockSocket([]);

            await expect(
                adapter.dispatchWebSocket("/chat", "unknown-event", { "ws.socket": mockSocket }),
            ).rejects.toThrow("WebSocket route not found");
        });
    });

    describe("WebSocket context", () => {
        it("@WsContext() provides populated WebSocketContext", async () => {
            const mockSocket: WebSocketSocket = {
                id: "ws-ctx-test",
                send: () => {},
                close: () => {},
                terminate: () => {},
            };

            const result = await adapter.dispatchWebSocket(
                "/chat",
                "ctx-test",
                { "ws.socket": mockSocket },
            ) as { success: boolean; data: { socketId: string; hasState: boolean } };

            expect(result.success).toBe(true);
            expect(result.data.socketId).toBe("ws-ctx-test");
            expect(result.data.hasState).toBe(true);
        });
    });

    describe("websocket exception handling", () => {
        it("should catch errors via @UseFilters on gateway", async () => {
            executionOrder = [];
            const mockSocket = createMockSocket([]);

            const result = await adapter.dispatchWebSocket(
                "/errors",
                "$message",
                { "ws.socket": mockSocket, "ws.message": "test" },
            ) as { success: boolean; statusCode: number; message: string };

            expect(result.success).toBe(false);
            expect(result.statusCode).toBe(500);
            expect(result.message).toBe("Caught: WS error test");
            expect(executionOrder).toContain("ws-error-filter");
        });
    });

    describe("websocket execution order", () => {
        it("should apply guards → interceptor → handler → transformer", async () => {
            executionOrder = [];

            const sent: string[] = [];
            const mockSocket = createMockSocket([]);
            const message = JSON.stringify({ type: "test", data: "hi" });

            const result = await adapter.dispatchWebSocket(
                "/chat",
                "$message",
                { "ws.socket": mockSocket, "ws.message": message },
            ) as { success: boolean; data: { echo: string; upper: string } };

            expect(result.success).toBe(true);
            expect(executionOrder).toEqual([
                "ws-interceptor-before",
                "ws-guard",
                "on-message",
                "ws-interceptor-after",
                "ws-transformer",
            ]);
        });
    });

    describe("HTTP and WebSocket coexistence", () => {
        it("should serve HTTP routes alongside WebSocket routes", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/ws-simple/ping`);

            expect(res.status).toBe(200);
            const body = await res.json() as { success: boolean; data: { pong: boolean } };
            expect(body.success).toBe(true);
            expect(body.data.pong).toBe(true);
        });

        it("should handle HTTP path params with WebSocket registered", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/ws-simple/abc123`);

            expect(res.status).toBe(200);
            const body = await res.json() as { success: boolean; data: { id: string } };
            expect(body.success).toBe(true);
            expect(body.data.id).toBe("abc123");
        });
    });
});
