import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

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
    Query,
    Body,
    Headers,
    Request,
    Response,
    Ctx,
    WebSocket,
    OnMessage,
    createApplication,
    type ApplicationContext,
} from "@sim-lu/core";
import {
    BadRequestException,
    NotFoundException,
    ConflictException,
    ok,
    created,
    noContent,
    type SuccessResponse,
    type FailureResponse,
} from "@sim-lu/error";
import { ExpressAdapter } from "@sim-lu/platform-express";
import {
    MemoryLogTarget,
    type LogEntry,
} from "@sim-lu/error";
import { describeHttpErrorContract } from "../../../test/helpers/http-error-contract.js";

describe("ExpressAdapter Contract", () => {
    let app: ApplicationContext;
    let adapter: ExpressAdapter;
    let port: number;
    let memoryLog: MemoryLogTarget<LogEntry>;

    beforeAll(async () => {
        memoryLog = new MemoryLogTarget<LogEntry>();
        adapter = new ExpressAdapter({
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

    beforeEach(() => {
        memoryLog.entries = [];
    });

    describe("HTTP method support", () => {
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

    describe("parameter extraction", () => {
        it("extracts path params", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/items/42`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { id: string } };
            expect(body.data.id).toBe("42");
        });

        it("extracts query params", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/search?q=hello&page=1`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { q: string; page: string } };
            expect(body.data.q).toBe("hello");
            expect(body.data.page).toBe("1");
        });

        it("extracts headers", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/headers`, {
                headers: { "x-custom-header": "custom-value" },
            });
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { custom: string } };
            expect(body.data.custom).toBe("custom-value");
        });

        it("parses JSON body", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/echo`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ message: "hello", count: 42 }),
            });
            expect(res.status).toBe(201);
            const body = await res.json() as { data: { message: string; count: number } };
            expect(body.data.message).toBe("hello");
            expect(body.data.count).toBe(42);
        });

        it("handles nested path params", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/nested/items/123/details`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { itemId: string } };
            expect(body.data.itemId).toBe("123");
        });
    });

    describeHttpErrorContract("express", () => ({ port, memoryLog }));

    describe("content types", () => {
        it("sets content-type to application/json for JSON responses", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/get`);
            expect(res.headers.get("content-type")).toContain("application/json");
        });

        it("handles content-type: application/json with body parsing", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/echo`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ data: "test" }),
            });
            expect(res.status).toBe(201);
        });

        it("handles text/plain content type", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/text`, {
                method: "POST",
                headers: { "content-type": "text/plain" },
                body: "plain text body",
            });
            expect(res.status).toBe(201);
            const body = await res.json() as { data: { text: string } };
            expect(body.data.text).toBe("plain text body");
        });
    });

    describe("adapter metadata", () => {
        it("reports name as 'express'", () => {
            expect(adapter.name).toBe("express");
        });

        it("returns port after listening", () => {
            expect(adapter.getPort()).toBeGreaterThan(0);
        });

        it("returns registered routes", () => {
            const routes = adapter.getRegisteredHttpRoutes();
            expect(routes.length).toBeGreaterThan(0);
            const methods = routes.map((r) => r.method);
            expect(methods).toContain("GET");
            expect(methods).toContain("POST");
            expect(methods).toContain("PUT");
            expect(methods).toContain("DELETE");
            expect(methods).toContain("PATCH");
            expect(methods).toContain("HEAD");
            expect(methods).toContain("OPTIONS");
        });

        it("returns registered WebSocket paths", () => {
            expect(adapter.getRegisteredWebSocketPaths()).toContain("/ws-events");
        });

        it("returns error handler instance", () => {
            expect(adapter.getErrorHandler()).toBeDefined();
        });
    });

    describe("adapter instance methods", () => {
        it("can get Express instance", () => {
            const instance = adapter.getInstance();
            expect(typeof instance).toBe("function");
            expect(typeof instance.use).toBe("function");
        });

        it("can dispatch HTTP requests", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/contract/get`);
            expect(res.status).toBe(200);
        });
    });
});

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

    @Get("/search")
    public search(
        @Query("q") q: string,
        @Query("page") page: string,
    ): SuccessResponse<{ q: string; page: string }> {
        return ok({ q, page });
    }

    @Get("/headers")
    public getHeaders(@Headers("x-custom-header") custom: string): SuccessResponse<{ custom: string }> {
        return ok({ custom });
    }

    @Post("/echo")
    public echo(@Body() body: { message: string; count: number }): SuccessResponse<{ message: string; count: number }> {
        return created(body);
    }

    @Post("/text")
    public text(@Body() body: unknown): SuccessResponse<{ text: string }> {
        return created({ text: body as string });
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

    @Get("/internal-error")
    public internalError(): never {
        throw new Error("unexpected crash");
    }

    @Get("/generic")
    public generic(): never {
        throw new Error("unexpected crash");
    }
}

@Controller("nested/items")
class NestedController {
    @Get("/:itemId/details")
    public details(@Param("itemId") itemId: string): SuccessResponse<{ itemId: string }> {
        return ok({ itemId });
    }
}

@WebSocket("/ws-events")
class WsGateway {
    @OnMessage()
    public onMessage(): SuccessResponse<{ ok: boolean }> {
        return ok({ ok: true });
    }
}

@Module({
    controllers: [ContractController, NestedController, WsGateway],
})
class ContractModule {}
