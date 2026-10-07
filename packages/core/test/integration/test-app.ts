import { type IncomingMessage, type ServerResponse } from "node:http";

import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    Module,
    Param,
    Post,
    Put,
    Query,
    Ctx,
    Request,
    Response,
    NodeHttpKernel,
    MutableHttpResponse,
    type ExecutionContext,
    type Guard,
    type GuardContext,
    type Interceptor,
    type Pipe,
    type ExceptionFilter,
    type Transformer,
    type OnModuleInit,
    type OnModuleDestroy,
    type OnApplicationBootstrap,
    type BeforeApplicationShutdown,
    type OnApplicationShutdown,
} from "@sim-lu/core";
import type { HttpRequest } from "@sim-lu/http";
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

export interface TestEntity {
    id: string;
    name: string;
    value: number;
}

export interface TestCreateDto {
    name: string;
    value: number;
}

export interface TestUpdateDto {
    name?: string;
    value?: number;
}

export class CounterService implements OnModuleInit {
    public callCount = 0;
    public initOrder: string[] = [];

    public onModuleInit(): void {
        this.initOrder.push("CounterService");
    }

    public increment(): number {
        this.callCount++;
        return this.callCount;
    }

    public get count(): number {
        return this.callCount;
    }
}

export class TrackingService {
    public calls: string[] = [];

    public track(label: string): void {
        this.calls.push(label);
    }

    public reset(): void {
        this.calls = [];
    }
}

export class LifecycleTracker implements
    OnModuleInit,
    OnApplicationBootstrap,
    OnModuleDestroy,
    BeforeApplicationShutdown,
    OnApplicationShutdown
{
    public order: string[] = [];

    public onModuleInit(): void {
        this.order.push("onModuleInit");
    }

    public onApplicationBootstrap(): void {
        this.order.push("onApplicationBootstrap");
    }

    public onModuleDestroy(): void {
        this.order.push("onModuleDestroy");
    }

    public beforeApplicationShutdown(): void {
        this.order.push("beforeApplicationShutdown");
    }

    public onApplicationShutdown(): void {
        this.order.push("onApplicationShutdown");
    }
}

@Controller("hello")
export class HelloController {
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
export class EchoController {
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

export class ItemsController {
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
export class ErrorController {
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

export class TestAdapter extends NodeHttpKernel {
    public readonly name = "test-adapter";
}

export function createTestModule(): TestAdapter {
    return new TestAdapter();
}

@Module({
    providers: [CounterService, TrackingService, LifecycleTracker],
})
export class TestAppModule {}
