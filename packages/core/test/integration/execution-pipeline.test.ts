import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import {
    Body,
    Controller,
    Get,
    Module,
    Param,
    Post,
    Query,
    Ctx,
    UseGuards,
    UseInterceptors,
    UseFilters,
    UseTransformers,
    UsePipes,
    createApplication,
    type ApplicationContext,
    type Guard,
    type GuardContext,
    type Interceptor,
    type ExecutionContext as CoreExecutionContext,
    type ExceptionFilter,
    type Transformer,
    type Pipe,
} from "@sim-lu/core";
import {
    BadRequestException,
    ok,
    created,
    type SuccessResponse,
} from "@sim-lu/error";
import { ExpressAdapter } from "@sim-lu/platform-express";
import { METADATA_KEYS, type ParameterPipeMetadata } from "@sim-lu/common";

let executionOrder: string[] = [];

class AlwaysPassGuard implements Guard {
    public canActivate(_context: GuardContext): boolean {
        executionOrder.push("guard-pass");
        return true;
    }
}

class AlwaysDenyGuard implements Guard {
    public canActivate(_context: GuardContext): boolean {
        executionOrder.push("guard-deny");
        return false;
    }
}

class FirstInterceptor implements Interceptor {
    public async intercept(
        _context: CoreExecutionContext,
        next: () => unknown | Promise<unknown>,
    ): Promise<unknown> {
        executionOrder.push("interceptor1-before");
        const result = await next();
        executionOrder.push("interceptor1-after");
        return result;
    }
}

class SecondInterceptor implements Interceptor {
    public async intercept(
        _context: CoreExecutionContext,
        next: () => unknown | Promise<unknown>,
    ): Promise<unknown> {
        executionOrder.push("interceptor2-before");
        const result = await next();
        executionOrder.push("interceptor2-after");
        return result;
    }
}

class EnvelopeTransformer implements Transformer {
    public transform(value: unknown): unknown {
        executionOrder.push("transformer");

        if (value === undefined || value === null) {
            return { success: true, data: null };
        }

        if (typeof value === "object" && value !== null && "success" in value) {
            return value;
        }

        return { success: true, data: value };
    }
}

class BadRequestFilter implements ExceptionFilter {
    public catch(exception: unknown): unknown {
        executionOrder.push("filter-bad-request");

        if (exception instanceof BadRequestException) {
            return {
                success: false,
                statusCode: 400,
                error: "Bad Request",
                message: `Filtered: ${exception.message}`,
                details: exception.details,
            };
        }

        throw exception;
    }
}

class UpperPipe implements Pipe<string | SuccessResponse<string>, string | SuccessResponse<string>> {
    public transform(value: string | SuccessResponse<string>): string | SuccessResponse<string> {
        if (typeof value === "string") {
            return value.toUpperCase();
        }
        return {
            ...value,
            data: (value.data as string).toUpperCase(),
        };
    }
}

@Controller("pipeline")
@UseGuards(AlwaysPassGuard)
@UseInterceptors(FirstInterceptor)
@UseTransformers(EnvelopeTransformer)
class PipelineController {
    @Get("/simple")
    public simple(): SuccessResponse<{ message: string }> {
        executionOrder.push("handler");
        return ok({ message: "pipeline works" });
    }

    @Get("/guarded")
    @UseGuards(AlwaysDenyGuard)
    public guarded(): SuccessResponse<never> {
        executionOrder.push("guarded-handler");
        return ok({ message: "should not reach" });
    }

    @Get("/parameter-pipe/:value")
    public parameterPipeTest(
        @Param("value") value: string,
    ): SuccessResponse<{ value: string }> {
        executionOrder.push("parameter-pipe-handler");
        return ok({ value });
    }

    @Get("/route-pipe")
    @UsePipes(UpperPipe)
    public routePipeTest(
        @Query("name") name: string,
    ): SuccessResponse<string> {
        executionOrder.push("route-pipe-handler");
        return ok(name);
    }

    @Post("/body")
    public bodyTest(@Body() body: { name: string }): SuccessResponse<{ name: string }> {
        return created(body);
    }

    @Get("/error")
    @UseFilters(BadRequestFilter)
    public errorTest(
        @Query("fail") fail: string = "false",
    ): SuccessResponse<{ ok: boolean }> {
        if (fail === "true") {
            throw new BadRequestException("Pipeline error");
        }

        return ok({ ok: true });
    }

    @Get("/ctx")
    public ctxTest(@Ctx() context: CoreExecutionContext): SuccessResponse<{ transport: string }> {
        return ok({ transport: context.transport });
    }
}

@Controller("multi-interceptor")
@UseInterceptors(FirstInterceptor, SecondInterceptor)
@UseTransformers(EnvelopeTransformer)
class MultiInterceptorController {
    @Get()
    public test(): SuccessResponse<{ ok: boolean }> {
        executionOrder.push("multi-handler");
        return ok({ ok: true });
    }
}

@Module({
    controllers: [PipelineController, MultiInterceptorController],
    providers: [
        AlwaysPassGuard,
        AlwaysDenyGuard,
        FirstInterceptor,
        SecondInterceptor,
        EnvelopeTransformer,
        BadRequestFilter,
        UpperPipe,
    ],
})
class PipelineModule {}

Reflect.defineMetadata(
    METADATA_KEYS.PARAMETER_PIPES,
    [{ index: 0, pipe: UpperPipe }] as readonly ParameterPipeMetadata[],
    PipelineController.prototype,
    "parameterPipeTest",
);

describe("Execution Pipeline E2E", () => {
    let app: ApplicationContext;
    let adapter: ExpressAdapter;
    let port: number;

    beforeAll(async () => {
        adapter = new ExpressAdapter({
            error: {
                console: false,
            },
        });
        app = await createApplication(PipelineModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });
        port = adapter.getPort() as number;
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        executionOrder = [];
    });

    describe("execution ordering", () => {
        it("should execute in order: interceptor before → guard → handler → interceptor after → transformer", async () => {
            executionOrder = [];
            const res = await fetch(`http://127.0.0.1:${port}/pipeline/simple`);

            expect(res.status).toBe(200);
            expect(executionOrder).toEqual([
                "interceptor1-before",
                "guard-pass",
                "handler",
                "interceptor1-after",
                "transformer",
            ]);
        });
    });

    describe("guards", () => {
            it("should not invoke handler when guard denies and return 403", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/pipeline/guarded`);

            expect(res.status).toBe(403);
            expect(executionOrder).toContain("guard-deny");
            expect(executionOrder).not.toContain("guarded-handler");
        });
    });

    describe("pipes", () => {
        it("should apply parameter-level pipe to transform input", async () => {
            executionOrder = [];
            const res = await fetch(`http://127.0.0.1:${port}/pipeline/parameter-pipe/hello`);

            expect(res.status).toBe(200);
            const body = await res.json() as { data: { value: string } };
            expect(body.data.value).toBe("HELLO");
            expect(executionOrder).toContain("parameter-pipe-handler");
        });

        it("should apply route-level pipe via @UsePipes to transform return value", async () => {
            executionOrder = [];
            const res = await fetch(`http://127.0.0.1:${port}/pipeline/route-pipe?name=hello`);

            expect(res.status).toBe(200);
            const body = await res.json() as { data: string };
            expect(body.data).toBe("HELLO");
            expect(executionOrder).toContain("route-pipe-handler");
        });
    });

    describe("interceptors", () => {
        it("should execute interceptor before and after handler", async () => {
            executionOrder = [];
            const res = await fetch(`http://127.0.0.1:${port}/pipeline/simple`);

            expect(res.status).toBe(200);
            const before = executionOrder.indexOf("interceptor1-before");
            const after = executionOrder.indexOf("interceptor1-after");
            const handler = executionOrder.indexOf("handler");

            expect(before).toBeLessThan(handler);
            expect(after).toBeGreaterThan(handler);
        });

        it("should execute multiple interceptors in chain order", async () => {
            executionOrder = [];
            const res = await fetch(`http://127.0.0.1:${port}/multi-interceptor`);

            expect(res.status).toBe(200);
            expect(executionOrder).toEqual([
                "interceptor1-before",
                "interceptor2-before",
                "multi-handler",
                "interceptor2-after",
                "interceptor1-after",
                "transformer",
            ]);
        });
    });

    describe("exception filters", () => {
        it("should catch BadRequestException via @UseFilters", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/pipeline/error?fail=true`);

            expect(res.status).toBe(400);
            const body = await res.json() as { message: string };
            expect(body.message).toBe("Filtered: Pipeline error");
            expect(executionOrder).toContain("filter-bad-request");
        });

        it("should pass through when no exception thrown", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/pipeline/error?fail=false`);

            expect(res.status).toBe(200);
            const body = await res.json() as { success: boolean; data: { ok: boolean } };
            expect(body.success).toBe(true);
        });
    });

    describe("transformers", () => {
        it("should wrap handler result", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/pipeline/simple`);

            expect(res.status).toBe(200);
            const body = await res.json() as { success: boolean; data: { message: string } };
            expect(body.success).toBe(true);
            expect(body.data.message).toBe("pipeline works");
        });
    });

    describe("body parsing", () => {
        it("should receive and echo parsed JSON body", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/pipeline/body`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "test-item" }),
            });

            expect(res.status).toBe(201);
            const body = await res.json() as { success: boolean; data: { name: string } };
            expect(body.success).toBe(true);
            expect(body.data.name).toBe("test-item");
        });
    });

    describe("execution context", () => {
        it("should provide context with transport type", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/pipeline/ctx`);

            expect(res.status).toBe(200);
            const body = await res.json() as { data: { transport: string } };
            expect(body.data.transport).toBe("http");
        });
    });
});
