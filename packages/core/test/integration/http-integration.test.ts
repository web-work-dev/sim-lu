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
    Request,
    Response,
    createApplication,
    type ApplicationContext,
    type ExecutionContext,
} from "@sim-lu/core";
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
    ok,
    created,
    fail,
    noContent,
    type SuccessResponse,
    type FailureResponse,
} from "@sim-lu/error";
import type { HttpRequest } from "@sim-lu/http";
import { ExpressAdapter } from "@sim-lu/platform-express";

interface TestEntity {
    id: string;
    name: string;
    value: number;
}

interface TestCreateDto {
    name: string;
    value: number;
}

interface TestUpdateDto {
    name?: string;
    value?: number;
}

class CounterService {
    public callCount = 0;

    public increment(): number {
        this.callCount++;
        return this.callCount;
    }

    public get count(): number {
        return this.callCount;
    }
}

@Controller("hello")
class HelloController {
    public constructor(
        private readonly counter: CounterService,
    ) {}

    @Get()
    public hello(@Query("name") name: string = "World"): SuccessResponse<{ message: string }> {
        this.counter.increment();
        return ok({ message: `Hello, ${name}!` });
    }

    @Get("/:name")
    public helloNamed(@Param("name") name: string): SuccessResponse<{ message: string; length: number }> {
        return ok({ message: `Hello, ${name}!`, length: name.length });
    }
}

@Controller("echo")
class EchoController {
    @Get("/params/:a/:b")
    public multiParam(
        @Param("a") a: string,
        @Param("b") b: string,
    ): SuccessResponse<{ a: string; b: string }> {
        return ok({ a, b });
    }

    @Post()
    public echo(@Body() body: Record<string, unknown>): SuccessResponse<unknown> {
        return ok(body);
    }

    @Get("/ctx")
    public ctx(@Ctx() context: ExecutionContext): SuccessResponse<{ transport: string }> {
        return ok({ transport: context.transport });
    }

    @Get("/request")
    public req(@Request() request: HttpRequest): SuccessResponse<{ method: string; url: string }> {
        return ok({ method: request.method, url: request.url });
    }

    @Get("/response")
    public res(@Response() response: unknown): SuccessResponse<{ hasResponse: boolean }> {
        return ok({ hasResponse: response !== undefined });
    }
}

@Controller("items")
class ItemsController {
    public constructor(
        private readonly counter: CounterService,
    ) {}

    private readonly items = new Map<string, TestEntity>();

    @Get()
    public list(): SuccessResponse<TestEntity[]> {
        return ok(Array.from(this.items.values()));
    }

    @Get("/:id")
    public find(@Param("id") id: string): SuccessResponse<TestEntity> | FailureResponse {
        const item = this.items.get(id);

        if (!item) {
            return fail(404, `Item ${id} not found`);
        }

        return ok(item);
    }

    @Post()
    public create(@Body() body: TestCreateDto): SuccessResponse<TestEntity> {
        const id = String(this.counter.count + 1);
        const item: TestEntity = { id, ...body };
        this.items.set(id, item);
        return created(item);
    }

    @Put("/:id")
    public update(
        @Param("id") id: string,
        @Body() body: TestUpdateDto,
    ): SuccessResponse<TestEntity> | FailureResponse {
        const existing = this.items.get(id);

        if (!existing) {
            return fail(404, `Item ${id} not found`);
        }

        const updated: TestEntity = {
            ...existing,
            ...body,
            id,
        };
        this.items.set(id, updated);
        return ok(updated);
    }

    @Delete("/:id")
    public remove(@Param("id") id: string): SuccessResponse<{ deleted: boolean }> | FailureResponse {
        const existed = this.items.has(id);
        this.items.delete(id);

        if (!existed) {
            return fail(404, `Item ${id} not found`);
        }

        return noContent();
    }
}

@Controller("error")
class ErrorController {
    @Get("/bad-request")
    public badRequest(): never {
        throw new BadRequestException("Bad request", { details: { field: "name" } });
    }

    @Get("/unauthorized")
    public unauthorized(): never {
        throw new UnauthorizedException("Not authorized");
    }

    @Get("/forbidden")
    public forbidden(): never {
        throw new ForbiddenException("Forbidden");
    }

    @Get("/not-found")
    public notFound(): never {
        throw new NotFoundException("Resource not found");
    }

    @Get("/conflict")
    public conflict(): never {
        throw new ConflictException("Conflict detected");
    }

    @Get("/generic")
    public generic(): never {
        throw new Error("Unexpected error");
    }

    @Get("/fail")
    public fail(): FailureResponse {
        return fail(400, "Validation failed");
    }
}

@Module({
    controllers: [HelloController, EchoController, ItemsController, ErrorController],
    providers: [CounterService],
})
class TestAppModule {}

interface ApiResponse {
    success: boolean;
    statusCode: number;
    data?: unknown;
    error?: string;
    message?: string;
}

describe("HTTP Integration", () => {
    let app: ApplicationContext;
    let adapter: ExpressAdapter;
    let port: number;

    beforeAll(async () => {
        adapter = new ExpressAdapter({
            error: {
                console: false,
            },
        });
        app = await createApplication(TestAppModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });
        port = adapter.getPort() as number;
    });

    afterAll(async () => {
        await app.close();
    });

    describe("route discovery", () => {
        it("should register controller routes", () => {
            const routes = app.getHttpRoutes();
            const paths = routes.map((r) => `${r.method} ${r.path}`);

            expect(paths).toContain("GET /hello");
            expect(paths).toContain("GET /hello/:name");
            expect(paths).toContain("GET /items");
            expect(paths).toContain("GET /items/:id");
            expect(paths).toContain("POST /items");
            expect(paths).toContain("PUT /items/:id");
            expect(paths).toContain("DELETE /items/:id");
        });
    });

    describe("GET requests", () => {
        it("should return greeting with default name", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/hello`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.success).toBe(true);
            expect(body.data).toMatchObject({ message: "Hello, World!" });
        });

        it("should return greeting with provided name", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/hello?name=Alice`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toMatchObject({ message: "Hello, Alice!" });
        });

        it("should handle URL-encoded query values", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/hello?name=John%20Doe`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toMatchObject({ message: "Hello, John Doe!" });
        });
    });

    describe("path parameters", () => {
        it("should extract single path parameter", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/hello/Kilo`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toMatchObject({ message: "Hello, Kilo!", length: 4 });
        });

        it("should extract multiple path parameters", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/echo/params/a/b`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toEqual({ a: "a", b: "b" });
        });

        it("should handle URL-encoded path parameters", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/hello/hello%20world`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toMatchObject({ message: "Hello, hello world!", length: 11 });
        });
    });

    describe("POST requests with body", () => {
        it("should echo request body", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/echo`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ foo: "bar", count: 42 }),
            });

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toEqual({ foo: "bar", count: 42 });
        });

        it("should create resource and return 201 status code in body", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/items`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "Widget", value: 100 }),
            });

            expect(res.status).toBe(201);
            const body = await res.json() as ApiResponse;
            expect(body.statusCode).toBe(201);
            expect(body.data).toMatchObject({ name: "Widget", value: 100 });
        });
    });

    describe("PUT requests", () => {
        it("should update created resource", async () => {
            const createRes = await fetch(`http://127.0.0.1:${port}/items`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "Gadget", value: 50 }),
            });

            const created = (await createRes.json() as ApiResponse).data as { id: string };

            const updateRes = await fetch(`http://127.0.0.1:${port}/items/${created.id}`, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "Updated Gadget", value: 75 }),
            });

            expect(updateRes.status).toBe(200);
            const body = await updateRes.json() as ApiResponse;
            expect(body.data).toMatchObject({ id: created.id, name: "Updated Gadget", value: 75 });
        });
    });

    describe("DELETE requests", () => {
        it("should delete resource", async () => {
            const createRes = await fetch(`http://127.0.0.1:${port}/items`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "ToDelete", value: 1 }),
            });

            const created = (await createRes.json() as ApiResponse).data as { id: string };

            const deleteRes = await fetch(`http://127.0.0.1:${port}/items/${created.id}`, {
                method: "DELETE",
            });

            expect(deleteRes.status).toBe(204);
            expect(deleteRes.headers.get("content-type")).toBeNull();
        });
    });

    describe("execution context", () => {
        it("should provide execution context with transport type", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/echo/ctx`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toMatchObject({ transport: "http" });
        });

        it("should provide request object", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/echo/request`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toMatchObject({ method: "GET", url: "/echo/request" });
        });

        it("should provide response object", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/echo/response`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toMatchObject({ hasResponse: true });
        });
    });

    describe("items CRUD", () => {
        it("should return empty list initially", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/items`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toEqual([]);
        });

        it("should return 404 for non-existent item", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/items/nonexistent`);

            expect(res.status).toBe(404);
            const body = await res.json() as ApiResponse;
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(404);
        });
    });

    describe("response headers", () => {
        it("should set x-request-id and x-trace-id headers", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/hello`);

            expect(res.headers.get("x-request-id")).toBeTruthy();
            expect(res.headers.get("x-trace-id")).toBeTruthy();
            expect(res.headers.get("x-request-id")).not.toBe(res.headers.get("x-trace-id"));
        });
    });
});
