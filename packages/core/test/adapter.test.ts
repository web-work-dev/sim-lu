import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

import { describe, expect, it } from "vitest";

import {
    Controller,
    Get,
    Module,
    OnMessage,
    Param,
    Post,
    WebSocket,
} from "@sim-lu/core";

import {
    ApplicationContext,
    createApplication,
    MutableHttpResponse,
    NodeHttpKernel,
    parseCookies,
    parseQuery,
    serializeBody,
} from "../src/index.js";
import { RequestExecutor } from "../src/adapter/request-executor.js";
import type { AdapterHttpHandler } from "../src/adapter/http-adapter.js";
import type { ExecutionDispatcher } from "../src/execution/execution-dispatcher.js";
import type { ExecutionContext } from "../src/execution/execution-context.js";
import type { HandlerRef } from "../src/execution/handler-ref.js";
import type { HttpRouteDefinition } from "../src/router/route-definition.js";
import { BadRequestException, ErrorHandler } from "@sim-lu/error";
import type { SerializedBody } from "@sim-lu/error";

class TestAdapter extends NodeHttpKernel {
    public readonly name = "test";
}

async function collect(
    response: ServerResponse,
): Promise<{
    readonly status: number;
    readonly body: string;
}> {
    const chunks: Buffer[] = [];

    response.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    return await new Promise((resolve) => {
        response.on("finish", () => {
            resolve({
                status: response.statusCode,
                body: Buffer.concat(chunks).toString("utf8"),
            });
        });
    });
}

function createPair(
    method: string,
    url: string,
    headers: Record<string, string> = {},
    body?: string,
): {
    readonly request: IncomingMessage;
    readonly response: ServerResponse;
} {
    const socket = new Socket();
    const request = new IncomingMessage(socket);
    request.method = method;
    request.url = url;
    request.headers = headers;

    if (body !== undefined) {
        queueMicrotask(() => {
            request.push(Buffer.from(body));
            request.push(null);
        });
    } else {
        queueMicrotask(() => {
            request.push(null);
        });
    }

    const response = new ServerResponse(request);
    const chunks: Buffer[] = [];
    const originalEnd = response.end.bind(response);

    response.write = ((chunk: unknown, encoding?: unknown, callback?: unknown) => {
        if (chunk) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
            chunks.push(buffer);
            response.emit("data", buffer);
        }

        if (typeof encoding === "function") {
            encoding();
        } else if (typeof callback === "function") {
            callback();
        }

        return true;
    }) as ServerResponse["write"];

    response.end = ((chunk?: unknown, encoding?: unknown, callback?: unknown) => {
        if (chunk && typeof chunk !== "function") {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
            chunks.push(buffer);
            response.emit("data", buffer);
        }

        const finish = typeof chunk === "function"
            ? chunk
            : typeof encoding === "function"
                ? encoding
                : callback;

        response.emit("finish");

        if (typeof finish === "function") {
            finish();
        }

        return response;
    }) as ServerResponse["end"];

    Object.defineProperty(response, "statusCode", {
        writable: true,
        value: 200,
    });

    void chunks;
    void originalEnd;

    return { request, response };
}

describe("adapter utilities", () => {
    it("parses query strings", () => {
        expect(parseQuery("?name=ada&tag=a&tag=b")).toEqual({
            name: "ada",
            tag: ["a", "b"],
        });
    });

    it("parses cookies", () => {
        expect(parseCookies("sid=abc; theme=dark")).toEqual({
            sid: "abc",
            theme: "dark",
        });
    });

    it("serializes json and text bodies", () => {
        expect(serializeBody({ ok: true })).toEqual({
            payload: "{\"ok\":true}",
            contentType: "application/json; charset=utf-8",
        });
        expect(serializeBody("pong")).toEqual({
            payload: "pong",
            contentType: "text/plain; charset=utf-8",
        });
    });
});

describe("ApplicationContext.listen", () => {
    it("binds discovered HTTP and websocket routes onto the chosen adapter", async () => {
        @Controller("users")
        class UserController {
            @Get()
            public list(): string[] {
                return ["ada"];
            }

            @Get("/:id")
            public find(): { readonly id: string } {
                return { id: "1" };
            }

            @Post()
            public create(): { readonly created: boolean } {
                return { created: true };
            }
        }

        @WebSocket("/live")
        class LiveGateway {
            @OnMessage()
            public onMessage(): string {
                return "pong";
            }
        }

        @Module({
            controllers: [UserController, LiveGateway],
        })
        class AppModule {}

        const app = await ApplicationContext.create(AppModule);
        const adapter = new TestAdapter();

        await app.listen(adapter, { port: 0 });

        expect(adapter.name).toBe("test");
        expect(app.isListening()).toBe(true);
        expect(app.getAdapter()).toBe(adapter);
        expect(adapter.getRegisteredHttpRoutes().map((route) => `${route.method} ${route.path}`)).toEqual([
            "GET /users",
            "GET /users/:id",
            "POST /users",
        ]);
        expect(adapter.getRegisteredWebSocketPaths()).toEqual(["/live"]);
        expect(await adapter.dispatchWebSocket("/live", "$message")).toBe("pong");

        await app.close();
        expect(app.isListening()).toBe(false);
    });

    it("createApplication requires an express or uws adapter and reuses it on listen", async () => {
        @Module({})
        class AppModule {}

        const adapter = new TestAdapter();
        const app = await createApplication(AppModule, adapter);

        await app.listen({ port: 0 });

        expect(app.getAdapter()).toBe(adapter);
        expect(app.getAdapter()?.name).toBe("test");

        await app.close();
    });

    it("throws when no adapter is chosen", async () => {
        @Module({})
        class AppModule {}

        const app = await ApplicationContext.create(AppModule);

        await expect(app.listen({ port: 0 })).rejects.toThrow(
            /Choose ExpressAdapter from @sim-lu\/platform-express or UwsAdapter from @sim-lu\/platform-uws/,
        );
    });

    it("throws when listen is called twice", async () => {
        @Module({})
        class AppModule {}

        const app = await ApplicationContext.create(AppModule);
        const adapter = new TestAdapter();

        await app.listen(adapter, { port: 0 });

        await expect(app.listen(adapter, { port: 0 })).rejects.toThrow(
            /already listening/,
        );

        await app.close();
    });

    it("executes HTTP handlers through the adapter", async () => {
        @Controller("health")
        class HealthController {
            @Get()
            public ping(): { readonly status: string } {
                return { status: "ok" };
            }
        }

        @Module({
            controllers: [HealthController],
        })
        class AppModule {}

        const app = await ApplicationContext.create(AppModule);
        const adapter = new TestAdapter();
        await app.listen(adapter, { port: 0 });

        const { request, response } = createPair("GET", "/health");
        const finished = collect(response);
        await adapter.handleRequest(request, response);
        const result = await finished;

        expect(result.status).toBe(200);
        expect(result.body).toBe("{\"status\":\"ok\"}");

        await app.close();
    });

    it("matches parameterized HTTP routes and binds @Param values", async () => {
        @Controller("users")
        class UserController {
            @Get()
            public list(): string[] {
                return ["ada"];
            }

            @Get("/:id")
            public find(
                @Param("id") id: string,
            ): { readonly id: string } {
                return { id };
            }
        }

        @Module({
            controllers: [UserController],
        })
        class AppModule {}

        const app = await ApplicationContext.create(AppModule);
        const adapter = new TestAdapter();
        await app.listen(adapter, { port: 0 });

        const { request, response } = createPair("GET", "/users/42");
        const finished = collect(response);
        await adapter.handleRequest(request, response);
        const result = await finished;

        expect(result.status).toBe(200);
        expect(result.body).toBe("{\"id\":\"42\"}");

        await app.close();
    });
});

describe("RequestExecutor status", () => {
    it("writes handler results onto the mutable response", async () => {
        const response = new MutableHttpResponse();
        response.setStatus(201);
        response.send({ id: 1 });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({ id: 1 });
    });
});

describe("RequestExecutor SerializedBody handling", () => {
    const errorHandler = new ErrorHandler({ console: false, silent: true });
    const errorBody: SerializedBody = errorHandler.handle(
        new BadRequestException("bad request", { details: { field: "name" } }),
    );

    function createMockDispatcher(
        returnValue: unknown,
    ): ExecutionDispatcher {
        return {
            execute: async (): Promise<unknown> => returnValue,
        } as ExecutionDispatcher;
    }

    function createExecutor(returnValue: unknown): RequestExecutor {
        return new RequestExecutor(() => createMockDispatcher(returnValue));
    }

    const mockRoute = {
        controller: { token: "Controller" as never },
        handler: {} as HandlerRef<object>,
        method: "GET",
        path: "/test",
        controllerPath: "/test",
        routePath: "/test",
        type: "http" as const,
        metadata: {} as never,
    } as HttpRouteDefinition;

    const mockRequest = {
        method: "GET",
        url: "/test",
        headers: {},
        query: {},
        params: {},
        body: undefined,
        cookies: {},
        ip: "",
        userAgent: "",
        connection: { remoteAddress: "", remotePort: 0 },
    } as never;

    it("applies SerializedBody result to MutableHttpResponse", async () => {
        const executor = createExecutor(errorBody);
        const response = new MutableHttpResponse();

        await executor.executeHttp(mockRoute, mockRequest, response);

        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
            success: false,
            statusCode: 400,
            error: "Bad Request",
            message: "bad request",
            details: { field: "name" },
        });
        expect(response.headers["content-type"]).toBe(
            "application/json; charset=utf-8",
        );
    });

    it("sets custom headers from SerializedBody on the response", async () => {
        const customBody: SerializedBody = {
            payload: JSON.stringify({
                success: false,
                statusCode: 418,
                error: "I'm a teapot",
                message: "teapot",
            }),
            contentType: "application/json; charset=utf-8",
            statusCode: 418,
            headers: {
                "content-type": "application/json; charset=utf-8",
                "x-custom": "custom-value",
            },
        };

        const executor = createExecutor(customBody);
        const response = new MutableHttpResponse();

        await executor.executeHttp(mockRoute, mockRequest, response);

        expect(response.status).toBe(418);
        expect(response.headers["x-custom"]).toBe("custom-value");
    });

    it("writes the response body exactly once (no double write)", async () => {
        let sendCount = 0;
        const response = new MutableHttpResponse();
        const originalSend = response.send.bind(response);
        response.send = (body: unknown) => {
            sendCount++;
            return originalSend(body);
        };

        const executor = createExecutor(errorBody);
        await executor.executeHttp(mockRoute, mockRequest, response);

        expect(sendCount).toBe(1);
        expect(response.body).toMatchObject({
            success: false,
            statusCode: 400,
        });
    });

    it("does not write to response when result is not a SerializedBody", async () => {
        const executor = createExecutor({ statusCode: 200, data: "ok" });
        const response = new MutableHttpResponse();

        await executor.executeHttp(mockRoute, mockRequest, response);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ statusCode: 200, data: "ok" });
    });

    it("handles undefined result without writing", async () => {
        const executor = createExecutor(undefined);
        const response = new MutableHttpResponse();

        await executor.executeHttp(mockRoute, mockRequest, response);

        expect(response.status).toBe(200);
        expect(response.body).toBeUndefined();
    });
});

describe("Node fallback error contract", () => {
    it("returns structured JSON 404 (not plain text) for unmatched routes", async () => {
        const adapter = new TestAdapter();
        await adapter.listen({ port: 0 });

        const { request, response } = createPair("GET", "/nonexistent");
        const finished = collect(response);
        await adapter.handleRequest(request, response);
        const result = await finished;

        expect(result.status).toBe(404);
        expect(response.getHeader("content-type")).toBe(
            "application/json; charset=utf-8",
        );
        expect(response.getHeader("x-request-id")).toBeTruthy();
        expect(response.getHeader("x-trace-id")).toBeTruthy();

        const parsed = JSON.parse(result.body) as Record<string, unknown>;
        expect(parsed.success).toBe(false);
        expect(parsed.statusCode).toBe(404);
        expect(parsed.error).toBe("Not Found");
        expect(parsed.message).toBe("Not Found");
        expect(result.body).not.toBe("Not Found");

        await adapter.close();
    });

    it("returns structured JSON 500 (not plain text) when handler throws", async () => {
        const adapter = new TestAdapter();
        const throwingHandler = async (): Promise<never> => {
            throw new Error("Something went wrong");
        };

        adapter.registerHttp(
            {
                type: "http" as const,
                method: "GET",
                path: "/crash",
                controllerPath: "/crash",
                routePath: "/crash",
                handler: {} as never,
                controller: {} as never,
                metadata: {} as never,
            },
            throwingHandler,
        );

        await adapter.listen({ port: 0 });

        const { request, response } = createPair("GET", "/crash");
        const finished = collect(response);
        await adapter.handleRequest(request, response);
        const result = await finished;

        expect(result.status).toBe(500);
        expect(response.getHeader("content-type")).toBe(
            "application/json; charset=utf-8",
        );
        expect(response.getHeader("x-request-id")).toBeTruthy();
        expect(response.getHeader("x-trace-id")).toBeTruthy();

        const parsed = JSON.parse(result.body) as Record<string, unknown>;
        expect(parsed.success).toBe(false);
        expect(parsed.statusCode).toBe(500);
        expect(parsed.error).toBe("Internal Server Error");
        expect(result.body).not.toBe("Internal Server Error");

        await adapter.close();
    });

    it("sets correlation headers on 404 responses", async () => {
        const adapter = new TestAdapter();
        await adapter.listen({ port: 0 });

        const requestId = "req-test-123";
        const traceId = "trace-test-456";
        const { request, response } = createPair("GET", "/missing", {
            "x-request-id": requestId,
            "x-trace-id": traceId,
        });
        const finished = collect(response);
        await adapter.handleRequest(request, response);
        await finished;

        expect(response.getHeader("x-request-id")).toBe(requestId);
        expect(response.getHeader("x-trace-id")).toBe(traceId);

        await adapter.close();
    });

    it("preserves HttpException status codes in error responses", async () => {
        const adapter = new TestAdapter();
        const badRequestHandler: AdapterHttpHandler = async () => {
            throw new BadRequestException("invalid input", { details: { field: "name" } });
        };

        adapter.registerHttp(
            {
                type: "http" as const,
                method: "POST",
                path: "/submit",
                controllerPath: "/submit",
                routePath: "/submit",
                handler: {} as never,
                controller: {} as never,
                metadata: {} as never,
            },
            badRequestHandler,
        );

        await adapter.listen({ port: 0 });

        const { request, response } = createPair("POST", "/submit", {}, JSON.stringify({}));
        const finished = collect(response);
        await adapter.handleRequest(request, response);
        const result = await finished;

        expect(result.status).toBe(400);
        const parsed = JSON.parse(result.body) as Record<string, unknown>;
        expect(parsed.success).toBe(false);
        expect(parsed.statusCode).toBe(400);
        expect(parsed.error).toBe("Bad Request");
        expect(parsed.message).toBe("invalid input");
        expect(parsed.details).toEqual({ field: "name" });

        await adapter.close();
    });
});
