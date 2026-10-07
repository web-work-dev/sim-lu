import { describe, expect, it, vi } from "vitest";

import { METADATA_KEYS } from "@sim-lu/common";

import { ExecutionDispatcher } from "../src/execution/execution-dispatcher.js";
import { ExecutionEngine } from "../src/execution/execution-engine.js";
import { ExecutionPipeline } from "../src/execution/execution-pipeline.js";
import { ExecutionRunner } from "../src/execution/execution-runner.js";
import { HandlerRef } from "../src/execution/handler-ref.js";
import { ExecutionContext } from "../src/execution/execution-context.js";
import { ControllerRef } from "../src/controller/controller-ref.js";
import { Container } from "../src/container/container.js";
import { ParameterResolver } from "../src/parameter/parameter-resolver.js";
import { ParameterPipeExecutor } from "../src/parameter/parameter-pipe-executor.js";
import { ParameterMetadataResolver } from "../src/parameter/parameter-metadata.js";
import { PipeRegistry } from "../src/pipe/pipe-registry.js";
import { Pipe } from "../src/pipe/pipe.js";
import { GuardExecutor } from "../src/guard/guard-executor.js";
import { GuardRegistry } from "../src/guard/guard-registry.js";
import { GuardMetadata } from "../src/guard/guard-metadata.js";
import { GuardContext } from "../src/guard/guard-context.js";
import { InterceptorExecutor } from "../src/interceptor/interceptor-executor.js";
import { InterceptorRegistry } from "../src/interceptor/interceptor-registry.js";
import { InterceptorMetadata } from "../src/interceptor/interceptor-metadata.js";
import type { Interceptor } from "../src/interceptor/interceptor.js";
import { ExceptionFilterExecutor } from "../src/exception-filter/exception-filter-executor.js";
import { ExceptionFilterRegistry } from "../src/exception-filter/exception-filter-registry.js";
import { ExceptionFilterMetadata } from "../src/exception-filter/exception-filter-metadata.js";
import type { ExceptionFilter } from "../src/exception-filter/exception-filter.js";
import { TransformerExecutor } from "../src/transform/transformer-executor.js";
import { TransformerRegistry } from "../src/transform/transformer-registry.js";
import { TransformerMetadata } from "../src/transform/transformer-metadata.js";
import type { Transformer } from "../src/transform/transformer.js";

describe("Execution", () => {
    // ─── ExecutionRunner ─────────────────────────────

    describe("ExecutionRunner", () => {
        it("executes handler with resolved parameters", async () => {
            class UserController {
                public getUser(id: string): string {
                    return `user:${id}`;
                }
            }

            const container = new Container();
            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            execution.set("params", { id: "123" });

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "param", index: 0, name: "id", handler: "getUser" }],
                UserController,
            );

            const result = await runner.execute(handler, execution);

            expect(result).toBe("user:123");
        });

        it("executes handler without parameters", async () => {
            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const container = new Container();
            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            const result = await runner.execute(handler, execution);

            expect(result).toBe("ok");
        });

        it("applies parameter pipes before invoking handler", async () => {
            class UpperPipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            class UserController {
                public getUser(name: string): string {
                    return `hello:${name}`;
                }
            }

            const container = new Container();
            container.register({ token: UpperPipe, useClass: UpperPipe });

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            execution.set("params", { name: "john" });

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "param", index: 0, name: "name", handler: "getUser" }],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.PARAMETER_PIPES,
                [{ index: 0, pipe: UpperPipe }],
                UserController.prototype,
                "getUser",
            );

            const result = await runner.execute(handler, execution);

            expect(result).toBe("hello:JOHN");
        });

        it("chains pipes and handler invocation", async () => {
            class UpperPipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            class ReversePipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.split("").reverse().join("");
                }
            }

            class UserController {
                public getName(greeting: string): string {
                    return `${greeting}:world`;
                }
            }

            const container = new Container();
            container.register({ token: UpperPipe, useClass: UpperPipe });
            container.register({ token: ReversePipe, useClass: ReversePipe });

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getName");
            const execution = new ExecutionContext(handler, "http");
            execution.set("params", { greeting: "hello" });

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "param", index: 0, name: "greeting", handler: "getName" }],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.PARAMETER_PIPES,
                [{ index: 0, pipe: UpperPipe }, { index: 0, pipe: ReversePipe }],
                UserController.prototype,
                "getName",
            );

            const result = await runner.execute(handler, execution);

            expect(result).toBe("OLLEH:world");
        });
    });

    // ─── HandlerRef ───────────────────────────────────

    describe("HandlerRef", () => {
        it("invoke calls handler method", () => {
            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            const result = handler.invoke();

            expect(result).toBe("ok");
        });

        it("invoke passes arguments", () => {
            class UserController {
                public getUser(a: unknown, b: unknown): string {
                    return `${a}:${b}`;
                }
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            const result = handler.invoke(["x", "y"]);

            expect(result).toBe("x:y");
        });

        it("invoke throws when handler is not a function", () => {
            class UserController {
                public getUser = "not a function";
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            expect(() => handler.invoke()).toThrow(
                'Handler "getUser" is not a function',
            );
        });

        it("invoke with default empty args", () => {
            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            const result = handler.invoke();

            expect(result).toBe("ok");
        });
    });

    // ─── ExecutionEngine ────────────────────────────

    describe("ExecutionEngine", () => {
        it("executes handler when guard allows", async () => {
            class AllowGuard {
                async canActivate() {
                    return true;
                }
            }

            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const container = new Container();
            container.register({ token: AllowGuard, useClass: AllowGuard });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            const result = await engine.execute(handler, execution);

            expect(result).toBe("ok");
        });

        it("throws when guard denies", async () => {
            class DenyGuard {
                async canActivate() {
                    return false;
                }
            }

            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const container = new Container();
            container.register({ token: DenyGuard, useClass: DenyGuard });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.GUARD,
                [DenyGuard],
                UserController,
            );

            await expect(engine.execute(handler, execution)).rejects.toThrow(
                "Execution denied by guard",
            );
        });

        it("does not execute handler when guard denies", async () => {
            class DenyGuard {
                canActivate() {
                    return false;
                }
            }

            let executed = false;

            class UserController {
                getUser(): string {
                    executed = true;
                    return "ok";
                }
            }

            const container = new Container();
            container.register({ token: DenyGuard, useClass: DenyGuard });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.GUARD,
                [DenyGuard],
                UserController,
            );

            await expect(
                engine.execute(handler, execution),
            ).rejects.toThrow("Execution denied by guard");

            expect(executed).toBe(false);
        });

        it("runs interceptors before and after the handler", async () => {
            const calls: string[] = [];

            class TimingInterceptor implements Interceptor {
                async intercept(
                    _context: ExecutionContext,
                    next: () => unknown | Promise<unknown>,
                ): Promise<unknown> {
                    calls.push("before");
                    const result = await next();
                    calls.push("after");
                    return result;
                }
            }

            class UserController {
                public getUser(): string {
                    calls.push("handler");
                    return "ok";
                }
            }

            const container = new Container();
            container.register({
                token: TimingInterceptor,
                useClass: TimingInterceptor,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [TimingInterceptor],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toBe("ok");
            expect(calls).toEqual(["before", "handler", "after"]);
        });

        it("does not invoke the handler when a guard denies after interceptors start", async () => {
            const calls: string[] = [];

            class OuterInterceptor implements Interceptor {
                async intercept(
                    _context: ExecutionContext,
                    next: () => unknown | Promise<unknown>,
                ): Promise<unknown> {
                    calls.push("interceptor-before");
                    try {
                        return await next();
                    } finally {
                        calls.push("interceptor-after");
                    }
                }
            }

            class DenyGuard {
                canActivate() {
                    calls.push("guard");
                    return false;
                }
            }

            class UserController {
                getUser(): string {
                    calls.push("handler");
                    return "ok";
                }
            }

            const container = new Container();
            container.register({
                token: OuterInterceptor,
                useClass: OuterInterceptor,
            });
            container.register({ token: DenyGuard, useClass: DenyGuard });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [OuterInterceptor],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.GUARD,
                [DenyGuard],
                UserController,
            );

            await expect(
                engine.execute(handler, execution),
            ).rejects.toThrow("Execution denied by guard");

            expect(calls).toEqual([
                "interceptor-before",
                "guard",
                "interceptor-after",
            ]);
        });

        it("lets interceptors interact with guards through execution state", async () => {
            class StateInterceptor implements Interceptor {
                intercept(
                    context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    context.set("role", "admin");
                    return next();
                }
            }

            class RoleGuard {
                canActivate(context: GuardContext): boolean {
                    return context.get<string>("role") === "admin";
                }
            }

            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const container = new Container();
            container.register({
                token: StateInterceptor,
                useClass: StateInterceptor,
            });
            container.register({ token: RoleGuard, useClass: RoleGuard });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [StateInterceptor],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.GUARD,
                [RoleGuard],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toBe("ok");
            expect(execution.get("role")).toBe("admin");
        });

        it("lets interceptors modify execution state around the handler", async () => {
            class StateInterceptor implements Interceptor {
                async intercept(
                    context: ExecutionContext,
                    next: () => unknown | Promise<unknown>,
                ): Promise<unknown> {
                    context.set("before", true);
                    const result = await next();
                    context.set("after", result);
                    return result;
                }
            }

            class UserController {
                public getUser(): string {
                    return "payload";
                }
            }

            const container = new Container();
            container.register({
                token: StateInterceptor,
                useClass: StateInterceptor,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [StateInterceptor],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toBe("payload");
            expect(execution.get("before")).toBe(true);
            expect(execution.get("after")).toBe("payload");
        });

        it("propagates interceptor errors before the handler runs", async () => {
            class FailingInterceptor implements Interceptor {
                intercept(): unknown {
                    throw new Error("interceptor failed");
                }
            }

            let executed = false;

            class UserController {
                public getUser(): string {
                    executed = true;
                    return "ok";
                }
            }

            const container = new Container();
            container.register({
                token: FailingInterceptor,
                useClass: FailingInterceptor,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [FailingInterceptor],
                UserController,
            );

            await expect(
                engine.execute(handler, execution),
            ).rejects.toThrow("interceptor failed");

            expect(executed).toBe(false);
        });

        it("propagates handler errors through interceptors", async () => {
            class PassThroughInterceptor implements Interceptor {
                intercept(
                    _context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    return next();
                }
            }

            class UserController {
                public getUser(): string {
                    throw new Error("handler failed");
                }
            }

            const container = new Container();
            container.register({
                token: PassThroughInterceptor,
                useClass: PassThroughInterceptor,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [PassThroughInterceptor],
                UserController,
            );

            await expect(
                engine.execute(handler, execution),
            ).rejects.toThrow("handler failed");
        });

        it("supports async interceptors wrapping the handler", async () => {
            class AsyncInterceptor implements Interceptor {
                async intercept(
                    _context: ExecutionContext,
                    next: () => unknown | Promise<unknown>,
                ): Promise<unknown> {
                    const result = await next();
                    return `wrapped:${String(result)}`;
                }
            }

            class UserController {
                public async getUser(): Promise<string> {
                    return "ok";
                }
            }

            const container = new Container();
            container.register({
                token: AsyncInterceptor,
                useClass: AsyncInterceptor,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [AsyncInterceptor],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toBe("wrapped:ok");
        });

        it("catches handler errors with an exception filter", async () => {
            class HttpExceptionFilter implements ExceptionFilter {
                catch(exception: unknown): unknown {
                    return `filtered:${String((exception as Error).message)}`;
                }
            }

            class UserController {
                public getUser(): string {
                    throw new Error("handler failed");
                }
            }

            const container = new Container();
            container.register({
                token: HttpExceptionFilter,
                useClass: HttpExceptionFilter,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [HttpExceptionFilter],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toBe("filtered:handler failed");
        });

        it("catches interceptor errors with an exception filter", async () => {
            class FailingInterceptor implements Interceptor {
                intercept(): unknown {
                    throw new Error("interceptor failed");
                }
            }

            class HttpExceptionFilter implements ExceptionFilter {
                catch(exception: unknown): unknown {
                    return `filtered:${String((exception as Error).message)}`;
                }
            }

            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const container = new Container();
            container.register({
                token: FailingInterceptor,
                useClass: FailingInterceptor,
            });
            container.register({
                token: HttpExceptionFilter,
                useClass: HttpExceptionFilter,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [FailingInterceptor],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [HttpExceptionFilter],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toBe("filtered:interceptor failed");
        });

        it("catches guard denial errors with an exception filter", async () => {
            class DenyGuard {
                canActivate() {
                    return false;
                }
            }

            class HttpExceptionFilter implements ExceptionFilter {
                catch(exception: unknown): unknown {
                    return `filtered:${String((exception as Error).message)}`;
                }
            }

            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const container = new Container();
            container.register({ token: DenyGuard, useClass: DenyGuard });
            container.register({
                token: HttpExceptionFilter,
                useClass: HttpExceptionFilter,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.GUARD,
                [DenyGuard],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [HttpExceptionFilter],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toBe("filtered:Execution denied by guard");
        });

        it("does not invoke filters when execution succeeds", async () => {
            let filterCalled = false;

            class HttpExceptionFilter implements ExceptionFilter {
                catch(): unknown {
                    filterCalled = true;
                    return "filtered";
                }
            }

            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const container = new Container();
            container.register({
                token: HttpExceptionFilter,
                useClass: HttpExceptionFilter,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [HttpExceptionFilter],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toBe("ok");
            expect(filterCalled).toBe(false);
        });

        it("rethrows unhandled exceptions when no filter matches", async () => {
            class HttpException extends Error {}

            class HttpExceptionFilter implements ExceptionFilter {
                catch(): unknown {
                    return "filtered";
                }
            }

            class UserController {
                public getUser(): string {
                    throw new Error("unhandled");
                }
            }

            const container = new Container();
            container.register({
                token: HttpExceptionFilter,
                useClass: HttpExceptionFilter,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.CATCH,
                [HttpException],
                HttpExceptionFilter,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [HttpExceptionFilter],
                UserController,
            );

            await expect(
                engine.execute(handler, execution),
            ).rejects.toThrow("unhandled");
        });

        it("supports async exception filters wrapping handler errors", async () => {
            class AsyncFilter implements ExceptionFilter {
                async catch(exception: unknown): Promise<unknown> {
                    return `async:${String((exception as Error).message)}`;
                }
            }

            class UserController {
                public async getUser(): Promise<string> {
                    throw new Error("boom");
                }
            }

            const container = new Container();
            container.register({ token: AsyncFilter, useClass: AsyncFilter });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [AsyncFilter],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toBe("async:boom");
        });

        it("transforms a successful handler result", async () => {
            class WrapTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { data: value };
                }
            }

            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const container = new Container();
            container.register({
                token: WrapTransformer,
                useClass: WrapTransformer,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [WrapTransformer],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toEqual({ data: "ok" });
        });

        it("transforms interceptor return values after the chain", async () => {
            class ReplaceInterceptor implements Interceptor {
                intercept(): unknown {
                    return "from-interceptor";
                }
            }

            class WrapTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { data: value };
                }
            }

            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const container = new Container();
            container.register({
                token: ReplaceInterceptor,
                useClass: ReplaceInterceptor,
            });
            container.register({
                token: WrapTransformer,
                useClass: WrapTransformer,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [ReplaceInterceptor],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [WrapTransformer],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toEqual({ data: "from-interceptor" });
        });

        it("transforms exception filter results", async () => {
            class HttpExceptionFilter implements ExceptionFilter {
                catch(exception: unknown): unknown {
                    return { error: (exception as Error).message };
                }
            }

            class WrapTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { data: value };
                }
            }

            class UserController {
                public getUser(): string {
                    throw new Error("handler failed");
                }
            }

            const container = new Container();
            container.register({
                token: HttpExceptionFilter,
                useClass: HttpExceptionFilter,
            });
            container.register({
                token: WrapTransformer,
                useClass: WrapTransformer,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [HttpExceptionFilter],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [WrapTransformer],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toEqual({
                data: { error: "handler failed" },
            });
        });

        it("does not transform unhandled exceptions", async () => {
            class WrapTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { data: value };
                }
            }

            class UserController {
                public getUser(): string {
                    throw new Error("unhandled");
                }
            }

            const container = new Container();
            container.register({
                token: WrapTransformer,
                useClass: WrapTransformer,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [WrapTransformer],
                UserController,
            );

            await expect(
                engine.execute(handler, execution),
            ).rejects.toThrow("unhandled");
        });

        it("lets transformers read execution state set by interceptors", async () => {
            class StateInterceptor implements Interceptor {
                intercept(
                    context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    context.set("role", "admin");
                    return next();
                }
            }

            class StateTransformer implements Transformer {
                transform(
                    value: unknown,
                    context: ExecutionContext,
                ): unknown {
                    return {
                        data: value,
                        role: context.get<string>("role"),
                    };
                }
            }

            class UserController {
                public getUser(): string {
                    return "ok";
                }
            }

            const container = new Container();
            container.register({
                token: StateInterceptor,
                useClass: StateInterceptor,
            });
            container.register({
                token: StateTransformer,
                useClass: StateTransformer,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [StateInterceptor],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [StateTransformer],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toEqual({ data: "ok", role: "admin" });
        });

        it("supports async transformers wrapping handler results", async () => {
            class AsyncTransformer implements Transformer {
                async transform(value: unknown): Promise<unknown> {
                    return { async: true, data: value };
                }
            }

            class UserController {
                public async getUser(): Promise<string> {
                    return "ok";
                }
            }

            const container = new Container();
            container.register({
                token: AsyncTransformer,
                useClass: AsyncTransformer,
            });

            const transformerRegistry = new TransformerRegistry(container);
            const transformerMetadata = new TransformerMetadata();
            const transformerExecutor = new TransformerExecutor(
                transformerMetadata,
                transformerRegistry,
            );

            const exceptionFilterRegistry = new ExceptionFilterRegistry(container);
            const exceptionFilterMetadata = new ExceptionFilterMetadata();
            const exceptionFilterExecutor = new ExceptionFilterExecutor(
                exceptionFilterMetadata,
                exceptionFilterRegistry,
            );

            const interceptorRegistry = new InterceptorRegistry(container);
            const interceptorMetadata = new InterceptorMetadata();
            const interceptorExecutor = new InterceptorExecutor(
                interceptorMetadata,
                interceptorRegistry,
            );

            const guardRegistry = new GuardRegistry(container);
            const guardMetadata = new GuardMetadata();
            const guardExecutor = new GuardExecutor(guardMetadata, guardRegistry);

            const paramMetadata = new ParameterMetadataResolver();
            const paramResolver = new ParameterResolver(paramMetadata);
            const pipeRegistry = new PipeRegistry(container);
            const pipeExecutor = new ParameterPipeExecutor(pipeRegistry);
            const runner = new ExecutionRunner(paramResolver, pipeExecutor);
            const engine = new ExecutionEngine(
                transformerExecutor,
                exceptionFilterExecutor,
                interceptorExecutor,
                guardExecutor,
                runner,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [AsyncTransformer],
                UserController,
            );

            const result = await engine.execute(handler, execution);

            expect(result).toEqual({ async: true, data: "ok" });
        });
    });

    // ─── ExecutionDispatcher ──────────────────────

    describe("ExecutionDispatcher", () => {
        const createDispatcher = (engineImpl?: () => unknown) => {
            const pipeline = new ExecutionPipeline();
            const engine = {
                execute: vi.fn(engineImpl ?? (() => Promise.resolve("result"))),
            };
            const dispatcher = new ExecutionDispatcher(pipeline, engine as unknown as ExecutionEngine);
            return { pipeline, engine, dispatcher };
        };

        it("executes through the pipeline", async () => {
            const { engine, dispatcher } = createDispatcher();
            const handlerRef = {} as HandlerRef<object>;
            const execution = new ExecutionContext(handlerRef, "http");

            await dispatcher.execute(handlerRef, execution);

            expect(engine.execute).toHaveBeenCalledWith(handlerRef, execution);
        });

        it("reaches ExecutionEngine", async () => {
            const { engine, dispatcher } = createDispatcher();
            const handlerRef = {} as HandlerRef<object>;
            const execution = new ExecutionContext(handlerRef, "http");

            await dispatcher.execute(handlerRef, execution);

            expect(engine.execute).toHaveBeenCalled();
        });

        it("returns the handler result", async () => {
            const { dispatcher } = createDispatcher(() => Promise.resolve("final-result"));
            const handlerRef = {} as HandlerRef<object>;
            const execution = new ExecutionContext(handlerRef, "http");

            const result = await dispatcher.execute(handlerRef, execution);

            expect(result).toBe("final-result");
        });

        it("middleware can execute before the engine", async () => {
            const order: string[] = [];

            const pipeline = new ExecutionPipeline();
            pipeline.use(async (context, next) => {
                order.push("before");
                await next(context);
            });

            const engine = {
                execute: vi.fn(async () => {
                    order.push("engine");
                    return "result";
                }),
            };
            const dispatcher = new ExecutionDispatcher(pipeline, engine as unknown as ExecutionEngine);

            const handlerRef = {} as HandlerRef<object>;
            const execution = new ExecutionContext(handlerRef, "http");

            await dispatcher.execute(handlerRef, execution);

            expect(order).toEqual(["before", "engine"]);
        });

        it("middleware can execute after the engine", async () => {
            const order: string[] = [];

            const pipeline = new ExecutionPipeline();
            pipeline.use(async (context, next) => {
                const result = await next(context);
                order.push("after");
                return result;
            });

            const engine = {
                execute: vi.fn(async () => {
                    order.push("engine");
                    return "result";
                }),
            };
            const dispatcher = new ExecutionDispatcher(pipeline, engine as unknown as ExecutionEngine);

            const handlerRef = {} as HandlerRef<object>;
            const execution = new ExecutionContext(handlerRef, "http");

            await dispatcher.execute(handlerRef, execution);

            expect(order).toEqual(["engine", "after"]);
        });

        it("middleware can modify/observe the execution context", async () => {
            const pipeline = new ExecutionPipeline();

            pipeline.use((context, next) => {
                context.set("middleware-key", "middleware-value");
                return next(context);
            });

            const engine = {
                execute: vi.fn((_handler, context) => {
                    const value = context.get("middleware-key");
                    context.set("engine-key", value);
                    return "result";
                }),
            };
            const dispatcher = new ExecutionDispatcher(pipeline, engine as unknown as ExecutionEngine);

            const handlerRef = {} as HandlerRef<object>;
            const execution = new ExecutionContext(handlerRef, "http");

            const result = await dispatcher.execute(handlerRef, execution);

            expect(result).toBe("result");
            expect(engine.execute).toHaveBeenCalled();
            const capturedContext = engine.execute.mock.calls[0] as [HandlerRef<object>, ExecutionContext];
            expect(capturedContext[1].get("engine-key")).toBe("middleware-value");
        });

        it("middleware errors propagate", async () => {
            const pipeline = new ExecutionPipeline();

            pipeline.use(async () => {
                throw new Error("middleware error");
            });

            const engine = { execute: vi.fn() };
            const dispatcher = new ExecutionDispatcher(pipeline, engine as unknown as ExecutionEngine);

            const handlerRef = {} as HandlerRef<object>;
            const execution = new ExecutionContext(handlerRef, "http");

            await expect(
                dispatcher.execute(handlerRef, execution),
            ).rejects.toThrow("middleware error");

            expect(engine.execute).not.toHaveBeenCalled();
        });

        it("engine errors propagate", async () => {
            const pipeline = new ExecutionPipeline();

            const engine = {
                execute: vi.fn().mockRejectedValue(new Error("engine error")),
            };
            const dispatcher = new ExecutionDispatcher(pipeline, engine as unknown as ExecutionEngine);

            const handlerRef = {} as HandlerRef<object>;
            const execution = new ExecutionContext(handlerRef, "http");

            await expect(
                dispatcher.execute(handlerRef, execution),
            ).rejects.toThrow("engine error");
        });
    });
});
