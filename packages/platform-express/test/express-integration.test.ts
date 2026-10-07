import { describe, expect, it, beforeAll, afterAll } from "vitest";

import {
    Body,
    Controller,
    Delete,
    Get,
    Module,
    Param,
    Post,
    Put,
    Query,
    Ctx,
    Request as RequestDecorator,
    Response as ResponseDecorator,
    Headers as HeadersDecorator,
    createApplication,
    type ApplicationContext,
    type ExecutionContext,
} from "@sim-lu/core";
import {
    BadRequestException,
    NotFoundException,
    ok,
    created,
    fail,
    type SuccessResponse,
    type FailureResponse,
} from "@sim-lu/error";
import type { HttpRequest } from "@sim-lu/http";
import { ExpressAdapter } from "../src/index.js";

interface TestItem {
    id: string;
    name: string;
}

@Controller("items")
class ItemsController {
    private readonly items: TestItem[] = [
        { id: "1", name: "Alpha" },
        { id: "2", name: "Beta" },
        { id: "3", name: "Gamma" },
    ];

    @Get()
    public list(): SuccessResponse<TestItem[]> {
        return ok(this.items);
    }

    @Get("/:id")
    public find(@Param("id") id: string): SuccessResponse<TestItem> | FailureResponse {
        const item = this.items.find((i) => i.id === id);

        if (!item) {
            return fail(404, `Item ${id} not found`);
        }

        return ok(item);
    }

    @Post()
    public create(@Body() body: { name: string }): SuccessResponse<TestItem> {
        const item: TestItem = {
            id: String(this.items.length + 1),
            name: body.name,
        };
        this.items.push(item);
        return created(item);
    }

    @Put("/:id")
    public update(
        @Param("id") id: string,
        @Body() body: { name: string },
    ): SuccessResponse<TestItem> | FailureResponse {
        const item = this.items.find((i) => i.id === id);

        if (!item) {
            return fail(404, `Item ${id} not found`);
        }

        item.name = body.name;
        return ok(item);
    }

    @Delete("/:id")
    public delete(@Param("id") id: string): SuccessResponse<{ deleted: boolean }> | FailureResponse {
        const index = this.items.findIndex((i) => i.id === id);

        if (index === -1) {
            return fail(404, `Item ${id} not found`);
        }

        this.items.splice(index, 1);
        return ok({ deleted: true });
    }
}

@Controller("headers")
class HeadersController {
    @Get()
            public test(@HeadersDecorator("x-custom") value: string): SuccessResponse<{ custom: string }> {
        return ok({ custom: value ?? "missing" });
    }
}

@Controller("error")
class ErrorController {
    @Get("/bad-request")
    public badRequest(): never {
        throw new BadRequestException("Bad request", { details: { field: "name" } });
    }

    @Get("/not-found")
    public notFound(): never {
        throw new NotFoundException("Resource not found");
    }

    @Get("/generic")
    public generic(): never {
        throw new Error("Unexpected error");
    }
}

@Controller("special")
class SpecialController {
    @Get("/query")
    public query(
        @Query("filter") filter: string = "all",
        @Query("limit") limit: string = "10",
    ): SuccessResponse<{ filter: string; limit: number }> {
        return ok({ filter, limit: Number.parseInt(limit, 10) });
    }

    @Get("/context")
    public ctx(@Ctx() context: ExecutionContext): SuccessResponse<{ transport: string }> {
        return ok({ transport: context.transport });
    }

    @Get("/request")
    public req(@RequestDecorator() request: HttpRequest): SuccessResponse<{ method: string; url: string }> {
        return ok({ method: request.method, url: request.url });
    }
}

@Module({
    controllers: [ItemsController, HeadersController, ErrorController, SpecialController],
})
class ExpressTestModule {}

describe("Express Adapter Integration", () => {
    let app: ApplicationContext;
    let adapter: ExpressAdapter;
    let port: number;

    beforeAll(async () => {
        adapter = new ExpressAdapter({
            error: {
                console: false,
            },
        });
        app = await createApplication(ExpressTestModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });
        port = adapter.getPort() as number;
    });

    afterAll(async () => {
        await app.close();
    });

    describe("GET requests", () => {
        it("should return list of items", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/items`);

            expect(res.status).toBe(200);
            const body = await res.json() as { success: boolean; data: TestItem[] };
            expect(body.success).toBe(true);
            expect(body.data).toHaveLength(3);
        });

        it("should return item by id", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/items/1`);

            expect(res.status).toBe(200);
            const body = await res.json() as { success: boolean; data: TestItem };
            expect(body.success).toBe(true);
            expect(body.data).toEqual({ id: "1", name: "Alpha" });
        });

        it("should return 404 for non-existent item", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/items/999`);

            expect(res.status).toBe(404);
            const body = await res.json() as { success: boolean; statusCode: number };
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(404);
        });
    });

    describe("POST requests", () => {
        it("should create a new item", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/items`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "Delta" }),
            });

            expect(res.status).toBe(201);
            const body = await res.json() as { success: boolean; data: TestItem };
            expect(body.success).toBe(true);
            expect(body.data.name).toBe("Delta");
        });
    });

    describe("PUT requests", () => {
        it("should update an existing item", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/items/1`, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "Alpha Updated" }),
            });

            expect(res.status).toBe(200);
            const body = await res.json() as { success: boolean; data: TestItem };
            expect(body.data.name).toBe("Alpha Updated");
        });
    });

    describe("DELETE requests", () => {
        it("should delete an item", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/items/1`, {
                method: "DELETE",
            });

            expect(res.status).toBe(200);
            const body = await res.json() as { success: boolean; data: { deleted: boolean } };
            expect(body.success).toBe(true);
            expect(body.data.deleted).toBe(true);
        });
    });

    describe("query parameters", () => {
        it("should parse query string parameters with defaults", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/special/query?filter=active&limit=5`);

            expect(res.status).toBe(200);
            const body = await res.json() as { data: { filter: string; limit: number } };
            expect(body.data).toEqual({ filter: "active", limit: 5 });
        });

        it("should use default values when query params absent", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/special/query`);

            expect(res.status).toBe(200);
            const body = await res.json() as { data: { filter: string; limit: number } };
            expect(body.data).toEqual({ filter: "all", limit: 10 });
        });
    });

    describe("headers", () => {
        it("should pass headers to controller", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/headers`, {
                headers: { "x-custom": "my-value" },
            });

            expect(res.status).toBe(200);
            const body = await res.json() as { data: { custom: string } };
            expect(body.data.custom).toBe("my-value");
        });
    });

    describe("execution context", () => {
        it("should provide context with transport type", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/special/context`);

            expect(res.status).toBe(200);
            const body = await res.json() as { data: { transport: string } };
            expect(body.data.transport).toBe("http");
        });

        it("should provide request object", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/special/request`);

            expect(res.status).toBe(200);
            const body = await res.json() as { data: { method: string; url: string } };
            expect(body.data.method).toBe("GET");
            expect(body.data.url).toBe("/special/request");
        });
    });

    describe("error handling", () => {
        it("should return 400 for BadRequestException", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/error/bad-request`);

            expect(res.status).toBe(400);
            const body = await res.json() as { success: boolean; statusCode: number; details?: unknown };
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(400);
            expect(body.details).toEqual({ field: "name" });
        });

        it("should return 404 for NotFoundException", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/error/not-found`);

            expect(res.status).toBe(404);
            const body = await res.json() as { success: boolean; statusCode: number; message: string };
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(404);
            expect(body.message).toBe("Resource not found");
        });

        it("should return 500 for generic Error", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/error/generic`);

            expect(res.status).toBe(500);
            const body = await res.json() as { success: boolean; statusCode: number; message: string };
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(500);
        });

        it("should return 404 for unmatched routes", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/nonexistent`);

            expect(res.status).toBe(404);
            const body = await res.json() as { success: boolean; statusCode: number };
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(404);
        });
    });

    describe("request correlation", () => {
        it("should set request ID and trace ID headers", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/items`);

            expect(res.headers.get("x-request-id")).toBeTruthy();
            expect(res.headers.get("x-trace-id")).toBeTruthy();
        });

        it("should respect client-provided request ID", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/items`, {
                headers: { "x-request-id": "client-trace-123" },
            });

            expect(res.headers.get("x-request-id")).toBe("client-trace-123");
        });
    });
});
