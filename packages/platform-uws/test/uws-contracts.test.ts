import { describe, expect, it, beforeAll, afterAll } from "vitest";

import {
    Controller,
    Get,
    Post,
    Delete,
    Patch,
    Put,
    Head,
    Options,
    Module,
    Param,
    Body,
    Cookies,
    WebSocket,
    OnMessage,
    OnOpen,
    OnClose,
    On,
    WsSocket,
    WsMessage,
    WsContext,
    Ctx,
    createApplication,
    type ApplicationContext,
    type ExecutionContext,
    type WebSocketSocket,
    type WebSocketContext,
} from "@sim-lu/core";
import {
    BadRequestException,
    NotFoundException,
    ConflictException,
    UnauthorizedException,
    ForbiddenException,
    ok,
    created,
    type SuccessResponse,
    type FailureResponse,
} from "@sim-lu/error";
import { UwsAdapter } from "../src/index.js";
import { describeHttpErrorContract } from "../../../test/helpers/http-error-contract.js";
import { MemoryLogTarget, type LogEntry } from "@sim-lu/error";

describe("uWS Adapter Contract", () => {
    let app: ApplicationContext;
    let adapter: UwsAdapter;
    let port: number;
    let memoryLog: MemoryLogTarget<LogEntry>;

    @Controller("contract")
    class ContractController {
        @Get("/get")
        public get(): SuccessResponse<{ method: string }> {
            return ok({ method: "GET" });
        }

        @Post("/post")
        public post(@Body() body: { name: string }): SuccessResponse<{ received: { name: string } }> {
            return created({ received: body });
        }

        @Put("/put")
        public put(@Body() body: object): SuccessResponse<{ method: string }> {
            return ok({ method: "PUT" });
        }

        @Patch("/patch")
        public patch(@Body() body: object): SuccessResponse<{ method: string }> {
            return ok({ method: "PATCH" });
        }

        @Delete("/delete")
        public delete(): SuccessResponse<{ method: string }> {
            return ok({ method: "DELETE" });
        }

        @Head("/head")
        public head(): void {
            return;
        }

        @Options("/options")
        public options(): void {
            return;
        }

        @Get("/items/:id")
        public items(@Param("id") id: string): SuccessResponse<{ id: string }> {
            return ok({ id });
        }

        @Get("/multi/:a/:b/:c")
        public multi(
            @Param("a") a: string,
            @Param("b") b: string,
            @Param("c") c: string,
        ): SuccessResponse<{ a: string; b: string; c: string }> {
            return ok({ a, b, c });
        }

        @Get("/cookies")
        public getCookies(@Cookies("session-id") sessionId: string): SuccessResponse<{ sessionId: string }> {
            return ok({ sessionId: sessionId ?? "none" });
        }

        @Get("/ctx")
        public ctx(@Ctx() context: ExecutionContext): SuccessResponse<{ transport: string }> {
            return ok({ transport: context.transport });
        }

        @Get("/bad-request")
        public badRequest(): never {
            throw new BadRequestException("invalid payload", { details: { field: "name" } });
        }

        @Get("/not-found")
        public notFound(): never {
            throw new NotFoundException("resource not found");
        }

        @Get("/conflict")
        public conflict(): never {
            throw new ConflictException("resource exists");
        }

        @Get("/unauthorized")
        public unauthorized(): never {
            throw new UnauthorizedException("not authenticated");
        }

        @Get("/forbidden")
        public forbidden(): never {
            throw new ForbiddenException("insufficient permissions");
        }

        @Get("/generic")
        public generic(): never {
            throw new Error("unexpected crash");
        }

        @Get("/empty-body")
        public emptyBody(@Body() body: unknown): SuccessResponse<{ body: unknown }> {
            return ok({ body });
        }
    }

    @WebSocket("/ws-test")
    class WsTestGateway {
        @OnOpen()
        public onOpen(@WsSocket() socket: WebSocketSocket): SuccessResponse<{ connected: boolean }> {
            return ok({ connected: true });
        }

        @OnMessage()
        public onMessage(@WsMessage() _message: string): SuccessResponse<{ ok: boolean }> {
            return ok({ ok: true });
        }

        @On("custom-event")
        public onCustom(): SuccessResponse<{ received: boolean }> {
            return ok({ received: true });
        }

        @On("context-test")
        public onContext(
            @WsContext() wsContext: WebSocketContext,
        ): SuccessResponse<{ socketId: string; hasState: boolean }> {
            return ok({
                socketId: wsContext.socket.id,
                hasState: wsContext.state instanceof Map,
            });
        }

        @OnClose()
        public onClose(@WsSocket() _socket: WebSocketSocket): SuccessResponse<{ closed: boolean }> {
            return ok({ closed: true });
        }
    }

    @Module({
        controllers: [ContractController, WsTestGateway],
    })
    class ContractModule {}

    beforeAll(async () => {
        memoryLog = new MemoryLogTarget<LogEntry>();
        adapter = new UwsAdapter({
            error: {
                console: false,
                targets: [memoryLog],
            },
        });
        app = await createApplication(ContractModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });
        port = adapter.getPort() as number;
    });

    afterAll(async () => {
        await app.close();
    });

    describe("adapter metadata", () => {
        it("reports name as 'uws'", () => {
            expect(adapter.name).toBe("uws");
        });

        it("returns port after listening", () => {
            expect(adapter.getPort()).toBeGreaterThan(0);
        });

        it("returns registered HTTP routes", () => {
            const routes = adapter.getRegisteredHttpRoutes();
            expect(routes.length).toBeGreaterThan(0);
            const paths = routes.map((r) => r.path);
            expect(paths).toContain("/contract/get");
            expect(paths).toContain("/contract/items/:id");
        });

        it("returns registered WebSocket paths", () => {
            expect(adapter.getRegisteredWebSocketPaths()).toContain("/ws-test");
        });

        it("returns error handler instance", () => {
            expect(adapter.getErrorHandler()).toBeDefined();
        });

        it("can get uWS app instance (undefined when uWS module unavailable)", () => {
            const instance = adapter.getInstance();
            expect(instance).toBeUndefined();
        });
    });

    describe("HTTP methods", () => {
        it("supports GET", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/get`);
            expect(res.status).toBe(200);
            expect(await res.json()).toMatchObject({ success: true, data: { method: "GET" } });
        });

        it("supports POST with body", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/post`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "test" }),
            });
            expect(res.status).toBe(201);
            const body = await res.json() as { data: { received: { name: string } } };
            expect(body.data.received.name).toBe("test");
        });

        it("supports PUT", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/put`, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ update: true }),
            });
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { method: string } };
            expect(body.data.method).toBe("PUT");
        });

        it("supports PATCH", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/patch`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ patch: true }),
            });
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { method: string } };
            expect(body.data.method).toBe("PATCH");
        });

        it("supports DELETE", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/delete`, {
                method: "DELETE",
            });
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { method: string } };
            expect(body.data.method).toBe("DELETE");
        });

        it("supports HEAD", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/head`, {
                method: "HEAD",
            });
            expect(res.status).toBe(200);
        });

        it("supports OPTIONS", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/options`, {
                method: "OPTIONS",
            });
            expect(res.status).toBe(200);
        });
    });

    describe("path parameters", () => {
        it("extracts single path param", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/items/42`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { id: string } };
            expect(body.data.id).toBe("42");
        });

        it("extracts multiple path params", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/multi/a/b/c`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { a: string; b: string; c: string } };
            expect(body.data).toEqual({ a: "a", b: "b", c: "c" });
        });
    });

    describeHttpErrorContract("uws", () => ({ port, memoryLog }));

    describe("additional uWS error cases", () => {
        it("returns 401 for UnauthorizedException", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/unauthorized`);
            expect(res.status).toBe(401);
            const body = await res.json() as FailureResponse;
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(401);
        });

        it("returns 403 for ForbiddenException", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/forbidden`);
            expect(res.status).toBe(403);
            const body = await res.json() as FailureResponse;
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(403);
        });
    });

    describe("content types", () => {
        it("sets content-type to application/json", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/get`);
            expect(res.headers.get("content-type")).toContain("application/json");
        });

        it("handles JSON body parsing", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/post`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "uws-test" }),
            });
            expect(res.status).toBe(201);
            const body = await res.json() as { data: { received: { name: string } } };
            expect(body.data.received.name).toBe("uws-test");
        });

        it("handles text body parsing", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/post`, {
                method: "POST",
                headers: { "content-type": "text/plain" },
                body: "hello text",
            });
            expect(res.status).toBe(201);
        });
    });

    describe("WebSocket dispatch", () => {
        const createMockSocket = (): WebSocketSocket => ({
            send: () => {},
            close: () => {},
            terminate: () => {},
        });

        it("dispatches OnOpen handler", async () => {
            const result = await adapter.dispatchWebSocket(
                "/ws-test",
                "$open",
                { "ws.socket": createMockSocket() },
            ) as { success: boolean; data: { connected: boolean } };

            expect(result.success).toBe(true);
            expect(result.data.connected).toBe(true);
        });

        it("dispatches OnMessage handler with message", async () => {
            const result = await adapter.dispatchWebSocket(
                "/ws-test",
                "$message",
                { "ws.socket": createMockSocket(), "ws.message": "test" },
            ) as { success: boolean; data: { ok: boolean } };

            expect(result.success).toBe(true);
            expect(result.data.ok).toBe(true);
        });

        it("dispatches On('custom-event') handler", async () => {
            const result = await adapter.dispatchWebSocket(
                "/ws-test",
                "custom-event",
                { "ws.socket": createMockSocket() },
            ) as { success: boolean; data: { received: boolean } };

            expect(result.success).toBe(true);
            expect(result.data.received).toBe(true);
        });

        it("dispatches OnClose handler", async () => {
            const result = await adapter.dispatchWebSocket(
                "/ws-test",
                "$close",
                { "ws.socket": createMockSocket() },
            ) as { success: boolean; data: { closed: boolean } };

            expect(result.success).toBe(true);
            expect(result.data.closed).toBe(true);
        });

        it("throws for unknown WebSocket path", async () => {
            await expect(
                adapter.dispatchWebSocket("/unknown", "$message", {}),
            ).rejects.toThrow("WebSocket route not found");
        });

        it("@WsContext() provides populated WebSocketContext", async () => {
            const mockSocket: WebSocketSocket = {
                id: "ws-ctx-test",
                send: () => {},
                close: () => {},
                terminate: () => {},
            };
            const result = await adapter.dispatchWebSocket(
                "/ws-test",
                "context-test",
                { "ws.socket": mockSocket },
            ) as { success: boolean; data: { socketId: string; hasState: boolean } };

            expect(result.success).toBe(true);
            expect(result.data.socketId).toBe("ws-ctx-test");
            expect(result.data.hasState).toBe(true);
        });

        it("throws for unknown WebSocket event", async () => {
            await expect(
                adapter.dispatchWebSocket("/ws-test", "unknown-event", {
                    "ws.socket": createMockSocket(),
                }),
            ).rejects.toThrow("WebSocket route not found");
        });
    });

    describe("cookies", () => {
        it("parses cookies from headers", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/cookies`, {
                headers: { "cookie": "session-id=abc-123" },
            });
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { sessionId: string } };
            expect(body.data.sessionId).toBe("abc-123");
        });
    });

    describe("HTTP and WebSocket coexistence", () => {
        it("serves HTTP routes when WebSocket routes are registered", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/get`);
            expect(res.status).toBe(200);
            const body = await res.json() as { success: boolean; data: { method: string } };
            expect(body.success).toBe(true);
            expect(body.data.method).toBe("GET");
        });
    });
});
