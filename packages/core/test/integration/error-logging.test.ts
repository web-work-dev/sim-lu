import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";

import {
    Controller,
    Get,
    Module,
    createApplication,
    type ApplicationContext,
} from "@sim-lu/core";
import {
    BadRequestException,
    NotFoundException,
    UnauthorizedException,
    InternalServerErrorException,
    ok,
    MemoryLogTarget,
    type LogEntry,
    type SuccessResponse,
    type FailureResponse,
} from "@sim-lu/error";
import { ExpressAdapter } from "@sim-lu/platform-express";

import { Writable } from "node:stream";
import { createMorganLogger, type LogEntry as MorganLogEntry } from "@sim-lu/error";

@Controller("logs")
class LogsController {
    @Get("/bad-request")
    public badRequest(): never {
        throw new BadRequestException("invalid input", { details: { field: "email" } });
    }

    @Get("/unauthorized")
    public unauthorized(): never {
        throw new UnauthorizedException("missing token");
    }

    @Get("/not-found")
    public notFound(): never {
        throw new NotFoundException("resource not found");
    }

    @Get("/server-error")
    public serverError(): never {
        throw new InternalServerErrorException("database connection failed");
    }

    @Get("/generic")
    public generic(): never {
        throw new Error("unknown error happened");
    }

    @Get("/ok")
    public ok(): SuccessResponse<{ status: string }> {
        return ok({ status: "ok" });
    }
}

@Module({
    controllers: [LogsController],
})
class LogsModule {}

describe("Error Logging & Middleware", () => {
    describe("MemoryLogTarget", () => {
        let app: ApplicationContext;
        let adapter: ExpressAdapter;
        let port: number;
        let memoryLog: MemoryLogTarget<LogEntry>;

        beforeEach(() => {
            memoryLog.entries = [];
        });

        beforeAll(async () => {
            memoryLog = new MemoryLogTarget<LogEntry>();
            adapter = new ExpressAdapter({
                error: {
                    console: false,
                    targets: [memoryLog],
                },
            });
            app = await createApplication(LogsModule, adapter);
            await app.listen({ port: 0, host: "127.0.0.1" });
            port = adapter.getPort() as number;
        });

        afterAll(async () => {
            await app.close();
        });

        it("logs 4xx errors at 'warn' level", async () => {
            await fetch(`http://127.0.0.1:${port}/logs/bad-request`);
            await new Promise((resolve) => setTimeout(resolve, 50));

            const warnEntry = memoryLog.entries.find((e) => e.level === "warn");
            expect(warnEntry).toBeDefined();
            expect(warnEntry!.error?.statusCode).toBe(400);
            expect(warnEntry!.error?.name).toBe("BadRequestException");
            expect(warnEntry!.message).toBe("invalid input");
        });

        it("logs 5xx errors at 'error' level", async () => {
            await fetch(`http://127.0.0.1:${port}/logs/server-error`);
            await new Promise((resolve) => setTimeout(resolve, 50));

            const errorEntry = memoryLog.entries.find((e) => e.level === "error");
            expect(errorEntry).toBeDefined();
            expect(errorEntry!.error?.statusCode).toBe(500);
        });

        it("logs unauthorized errors at 'warn' level", async () => {
            await fetch(`http://127.0.0.1:${port}/logs/unauthorized`);
            await new Promise((resolve) => setTimeout(resolve, 50));

            const warnEntry = memoryLog.entries.find((e) => e.message === "missing token");
            expect(warnEntry).toBeDefined();
            expect(warnEntry!.error?.statusCode).toBe(401);
        });

        it("logs not found at 'warn' level", async () => {
            await fetch(`http://127.0.0.1:${port}/logs/not-found`);
            await new Promise((resolve) => setTimeout(resolve, 50));

            const warnEntry = memoryLog.entries.find((e) => e.error?.statusCode === 404);
            expect(warnEntry).toBeDefined();
            expect(warnEntry!.message).toBe("resource not found");
        });

        it("includes request info in log entries", async () => {
            await fetch(`http://127.0.0.1:${port}/logs/bad-request`, {
                headers: { "x-request-id": "test-req-999", "x-trace-id": "test-trace-999" },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));

            const entry = memoryLog.entries.find((e) => e.error);
            expect(entry).toBeDefined();
            expect(entry!.requestId).toBe("test-req-999");
            expect(entry!.traceId).toBe("test-trace-999");
            expect(entry!.request).toBeDefined();
            expect(entry!.request?.method).toBe("GET");
            expect(entry!.request?.url).toBe("/logs/bad-request");
        });

        it("includes error details when present", async () => {
            await fetch(`http://127.0.0.1:${port}/logs/bad-request`);
            await new Promise((resolve) => setTimeout(resolve, 50));

            const entry = memoryLog.entries.find((e) => e.error);
            expect(entry).toBeDefined();
            expect(entry!.error?.details).toEqual({ field: "email" });
        });

        it("includes stack trace when includeStack is enabled", async () => {
            const stackLog = new MemoryLogTarget<LogEntry>();
            const stackAdapter = new ExpressAdapter({
                error: {
                    console: false,
                    includeStack: true,
                    targets: [stackLog],
                },
            });

            @Controller("stack-test")
            class StackTestController {
                @Get()
                public error(): never {
                    throw new Error("stack trace test");
                }
            }

            @Module({
                controllers: [StackTestController],
            })
            class StackTestModule {}

            const stackApp = await createApplication(StackTestModule, stackAdapter);
            await stackApp.listen({ port: 0, host: "127.0.0.1" });
            const stackPort = stackAdapter.getPort() as number;

            await fetch(`http://127.0.0.1:${stackPort}/stack-test`);
            await new Promise((resolve) => setTimeout(resolve, 50));

            const entry = stackLog.entries.find((e) => e.error);
            expect(entry).toBeDefined();
            expect(entry!.error?.stack).toBeDefined();
            expect(entry!.error?.stack).toContain("Error: stack trace test");

            await stackApp.close();
        });

        it("does not include stack in error response by default", async () => {
            const noStackAdapter = new ExpressAdapter({
                error: {
                    console: false,
                    includeStack: false,
                },
            });

            @Controller("no-stack")
            class NoStackController {
                @Get()
                public error(): never {
                    throw new Error("no stack response");
                }
            }

            @Module({
                controllers: [NoStackController],
            })
            class NoStackModule {}

            const noStackApp = await createApplication(NoStackModule, noStackAdapter);
            await noStackApp.listen({ port: 0, host: "127.0.0.1" });
            const noStackPort = noStackAdapter.getPort() as number;

            const res = await fetch(`http://127.0.0.1:${noStackPort}/no-stack`);
            expect(res.status).toBe(500);

            const body = await res.json() as { success: boolean; stack?: string };
            expect(body.stack).toBeUndefined();

            await noStackApp.close();
        });

        it("does not include details when includeDetails is false", async () => {
            const noDetailLog = new MemoryLogTarget<LogEntry>();
            const noDetailAdapter = new ExpressAdapter({
                error: {
                    console: false,
                    includeDetails: false,
                    targets: [noDetailLog],
                },
            });

            @Controller("no-detail")
            class NoDetailController {
                @Get()
                public error(): never {
                    throw new BadRequestException("no details", { details: { secret: "hidden" } });
                }
            }

            @Module({
                controllers: [NoDetailController],
            })
            class NoDetailModule {}

            const noDetailApp = await createApplication(NoDetailModule, noDetailAdapter);
            await noDetailApp.listen({ port: 0, host: "127.0.0.1" });
            const noDetailPort = noDetailAdapter.getPort() as number;

            const res = await fetch(`http://127.0.0.1:${noDetailPort}/no-detail`);
            expect(res.status).toBe(400);

            await new Promise((resolve) => setTimeout(resolve, 50));

            const body = await res.json() as FailureResponse;
            expect(body.details).toBeUndefined();

            await noDetailApp.close();
        });
    });

    describe("HTTP request logging via Morgan", () => {
        it("logs HTTP requests with method, url, and status", async () => {
            const morganLog = new MemoryLogTarget<LogEntry>();
            const morganAdapter = new ExpressAdapter({
                error: { console: false },
            });

            @Controller("morgan")
            class MorganController {
                @Get("/test")
                public test(): SuccessResponse<{ ok: boolean }> {
                    return ok({ ok: true });
                }

                @Get("/slow")
                public slow(): SuccessResponse<{ delay: number }> {
                    return ok({ delay: 10 });
                }
            }

            @Module({
                controllers: [MorganController],
            })
            class MorganModule {}

            const logger = createMorganLogger({
                loggerOptions: {
                    console: false,
                    targets: [morganLog],
                },
            });

            const morganApp = await createApplication(MorganModule, morganAdapter);
            morganAdapter.getInstance().use(logger);
            await morganApp.listen({ port: 0, host: "127.0.0.1" });
            const morganPort = morganAdapter.getPort() as number;

            await fetch(`http://127.0.0.1:${morganPort}/morgan/test`);
            await fetch(`http://127.0.0.1:${morganPort}/morgan/slow`);
            await fetch(`http://127.0.0.1:${morganPort}/morgan/nonexistent`);

            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(morganLog.entries.length).toBeGreaterThan(0);

            await morganApp.close();
        });
    });

    describe("log levels by status code", () => {
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
            app = await createApplication(LogsModule, adapter);
            await app.listen({ port: 0, host: "127.0.0.1" });
            port = adapter.getPort() as number;
        });

        afterAll(async () => {
            await app.close();
        });

        it("2xx responses do not generate error logs", async () => {
            memoryLog.entries = [];
            await fetch(`http://127.0.0.1:${port}/logs/ok`);
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(memoryLog.entries.length).toBe(0);
        });

        it("404 errors are logged at warn level", async () => {
            memoryLog.entries = [];
            await fetch(`http://127.0.0.1:${port}/nonexistent`);
            await new Promise((resolve) => setTimeout(resolve, 50));
            const warnEntry = memoryLog.entries.find((e) => e.level === "warn");
            expect(warnEntry).toBeDefined();
        });
    });

    describe("multiple log targets", () => {
        it("sends logs to multiple targets", async () => {
            const target1 = new MemoryLogTarget<LogEntry>();
            const target2 = new MemoryLogTarget<LogEntry>();

            const multiAdapter = new ExpressAdapter({
                error: {
                    console: false,
                    targets: [target1, target2],
                },
            });

            @Controller("multi")
            class MultiController {
                @Get()
                public error(): never {
                    throw new BadRequestException("multi target test");
                }
            }

            @Module({
                controllers: [MultiController],
            })
            class MultiModule {}

            const multiApp = await createApplication(MultiModule, multiAdapter);
            await multiApp.listen({ port: 0, host: "127.0.0.1" });
            const multiPort = multiAdapter.getPort() as number;

            await fetch(`http://127.0.0.1:${multiPort}/multi`);
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(target1.entries.length).toBeGreaterThan(0);
            expect(target2.entries.length).toBeGreaterThan(0);
            expect(target1.entries.length).toBe(target2.entries.length);

            await multiApp.close();
        });
    });

    describe("error response serialization", () => {
        let app: ApplicationContext;
        let adapter: ExpressAdapter;
        let port: number;

        beforeAll(async () => {
            adapter = new ExpressAdapter({
                error: {
                    console: false,
                    includeDetails: true,
                    includeStack: true,
                },
            });
            app = await createApplication(LogsModule, adapter);
            await app.listen({ port: 0, host: "127.0.0.1" });
            port = adapter.getPort() as number;
        });

        afterAll(async () => {
            await app.close();
        });

        it("includes error details in JSON response", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/logs/bad-request`);
            expect(res.status).toBe(400);

            const body = await res.json() as FailureResponse;
            expect(body.details).toEqual({ field: "email" });
        });

        it("includes stack in 500 error response", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/logs/generic`);
            expect(res.status).toBe(500);

            const body = await res.json() as { success: boolean; stack?: string };
            expect(body.stack).toBeDefined();
            expect(body.stack).toContain("Error: unknown error happened");
        });
    });
});
