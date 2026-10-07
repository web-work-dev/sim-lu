import { describe, expect, it, beforeEach } from "vitest";

import { Controller, METADATA_KEYS } from "@sim-lu/common";

import { Interceptor } from "../src/interceptor/interceptor.js";
import { InterceptorContext } from "../src/interceptor/interceptor-context.js";
import { InterceptorExecutor } from "../src/interceptor/interceptor-executor.js";
import { InterceptorMetadata } from "../src/interceptor/interceptor-metadata.js";
import { InterceptorRegistry } from "../src/interceptor/interceptor-registry.js";
import { ControllerRef } from "../src/controller/controller-ref.js";
import { Container } from "../src/container/container.js";
import { ExecutionContext } from "../src/execution/execution-context.js";
import { HandlerRef } from "../src/execution/handler-ref.js";

describe("Interceptor", () => {
    describe("InterceptorRegistry", () => {
        it("registers an interceptor", async () => {
            const container = new Container();
            const registry = new InterceptorRegistry(container);

            class LoggingInterceptor implements Interceptor {
                intercept(
                    _context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    return next();
                }
            }

            container.register({
                token: LoggingInterceptor,
                useClass: LoggingInterceptor,
            });
            await registry.register(LoggingInterceptor);

            expect(registry.has(LoggingInterceptor)).toBe(true);
        });

        it("retrieves a registered interceptor", async () => {
            const container = new Container();
            const registry = new InterceptorRegistry(container);

            class LoggingInterceptor implements Interceptor {
                intercept(
                    _context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    return next();
                }
            }

            container.register({
                token: LoggingInterceptor,
                useClass: LoggingInterceptor,
            });
            const interceptor = await registry.register(LoggingInterceptor);

            expect(registry.get(LoggingInterceptor)).toBe(interceptor);
        });

        it("throws when retrieving unregistered interceptor", () => {
            const container = new Container();
            const registry = new InterceptorRegistry(container);

            class LoggingInterceptor implements Interceptor {
                intercept(
                    _context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    return next();
                }
            }

            expect(() => registry.get(LoggingInterceptor)).toThrow(
                /Interceptor not found for token: LoggingInterceptor/,
            );
        });

        it("returns false for unregistered token in has()", () => {
            const container = new Container();
            const registry = new InterceptorRegistry(container);

            class LoggingInterceptor implements Interceptor {
                intercept(
                    _context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    return next();
                }
            }

            expect(registry.has(LoggingInterceptor)).toBe(false);
        });
    });

    describe("InterceptorMetadata", () => {
        let metadata: InterceptorMetadata;

        beforeEach(() => {
            metadata = new InterceptorMetadata();
        });

        it("returns no interceptors when none are defined", () => {
            @Controller("/users")
            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            expect(metadata.getControllerInterceptors(controller)).toEqual([]);
            expect(metadata.getHandlerInterceptors(handler)).toEqual([]);
            expect(metadata.getInterceptors(handler)).toEqual([]);
        });

        it("returns class-level interceptors", () => {
            class LoggingInterceptor {}

            class UserController {
                public getUser() {}
            }

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [LoggingInterceptor],
                UserController,
            );

            const controller = new UserController();
            const interceptors =
                metadata.getControllerInterceptors(controller);

            expect(interceptors).toEqual([LoggingInterceptor]);
        });

        it("returns method-level interceptors", () => {
            class LoggingInterceptor {}

            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [LoggingInterceptor],
                UserController.prototype,
                "getUser",
            );

            const interceptors = metadata.getHandlerInterceptors(handler);

            expect(interceptors).toEqual([LoggingInterceptor]);
        });

        it("orders class interceptors before method interceptors", () => {
            class ClassInterceptor {}
            class MethodInterceptor {}

            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [ClassInterceptor],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [MethodInterceptor],
                UserController.prototype,
                "getUser",
            );

            expect(metadata.getInterceptors(handler)).toEqual([
                ClassInterceptor,
                MethodInterceptor,
            ]);
        });

        it("preserves multiple interceptor order", () => {
            class FirstInterceptor {}
            class SecondInterceptor {}
            class ThirdInterceptor {}

            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [FirstInterceptor, SecondInterceptor],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [ThirdInterceptor],
                UserController.prototype,
                "getUser",
            );

            expect(metadata.getInterceptors(handler)).toEqual([
                FirstInterceptor,
                SecondInterceptor,
                ThirdInterceptor,
            ]);
        });

        it("inherits class-level interceptors from a parent controller", () => {
            class ParentInterceptor {}

            class ParentController {
                public getUser() {}
            }

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [ParentInterceptor],
                ParentController,
            );

            class ChildController extends ParentController {}

            const controller = new ChildController();
            const interceptors =
                metadata.getControllerInterceptors(controller);

            expect(interceptors).toEqual([ParentInterceptor]);
        });

        it("inherits method-level interceptors from a parent prototype", () => {
            class ParentInterceptor {}

            class ParentController {
                public getUser() {}
            }

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [ParentInterceptor],
                ParentController.prototype,
                "getUser",
            );

            class ChildController extends ParentController {}

            const controller = new ChildController();
            const ref = new ControllerRef(ChildController, controller);
            const handler = new HandlerRef(ref, "getUser");

            expect(metadata.getHandlerInterceptors(handler)).toEqual([
                ParentInterceptor,
            ]);
        });
    });

    describe("InterceptorContext", () => {
        it("exposes handler and transport from ExecutionContext", () => {
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");
            const context = new InterceptorContext(execution);

            expect(context.handler).toBe(handlerRef);
            expect(context.transport).toBe("http");
        });

        it("delegates state operations to ExecutionContext", () => {
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");
            const context = new InterceptorContext(execution);

            context.set("key", "value");

            expect(context.get<string>("key")).toBe("value");
            expect(context.has("key")).toBe(true);
            expect(context.getState().has("key")).toBe(true);
            expect(context.delete("key")).toBe(true);
            expect(context.has("key")).toBe(false);
        });
    });

    describe("InterceptorExecutor", () => {
        it("executes next when no interceptors are defined", async () => {
            class UserController {
                public getUser() {}
            }

            const container = new Container();
            const registry = new InterceptorRegistry(container);
            const metadata = new InterceptorMetadata();
            const executor = new InterceptorExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            const result = await executor.execute(
                handler,
                execution,
                () => "handler",
            );

            expect(result).toBe("handler");
        });

        it("executes interceptors through next()", async () => {
            const calls: string[] = [];

            class LoggingInterceptor implements Interceptor {
                intercept(
                    _context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    calls.push("interceptor");
                    return next();
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: LoggingInterceptor,
                useClass: LoggingInterceptor,
            });

            const registry = new InterceptorRegistry(container);
            const metadata = new InterceptorMetadata();
            const executor = new InterceptorExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [LoggingInterceptor],
                UserController,
            );

            const result = await executor.execute(
                handler,
                execution,
                () => {
                    calls.push("handler");
                    return "ok";
                },
            );

            expect(result).toBe("ok");
            expect(calls).toEqual(["interceptor", "handler"]);
        });

        it("preserves the handler return value", async () => {
            class PassThroughInterceptor implements Interceptor {
                intercept(
                    _context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    return next();
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: PassThroughInterceptor,
                useClass: PassThroughInterceptor,
            });

            const registry = new InterceptorRegistry(container);
            const metadata = new InterceptorMetadata();
            const executor = new InterceptorExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [PassThroughInterceptor],
                UserController,
            );

            const result = await executor.execute(
                handler,
                execution,
                () => ({ id: 1 }),
            );

            expect(result).toEqual({ id: 1 });
        });

        it("supports sync interceptors", async () => {
            class SyncInterceptor implements Interceptor {
                intercept(
                    _context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    return next();
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: SyncInterceptor,
                useClass: SyncInterceptor,
            });

            const registry = new InterceptorRegistry(container);
            const metadata = new InterceptorMetadata();
            const executor = new InterceptorExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [SyncInterceptor],
                UserController,
            );

            const result = await executor.execute(
                handler,
                execution,
                () => "sync",
            );

            expect(result).toBe("sync");
        });

        it("supports async interceptors", async () => {
            class AsyncInterceptor implements Interceptor {
                async intercept(
                    _context: ExecutionContext,
                    next: () => unknown | Promise<unknown>,
                ): Promise<unknown> {
                    return await next();
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: AsyncInterceptor,
                useClass: AsyncInterceptor,
            });

            const registry = new InterceptorRegistry(container);
            const metadata = new InterceptorMetadata();
            const executor = new InterceptorExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [AsyncInterceptor],
                UserController,
            );

            const result = await executor.execute(
                handler,
                execution,
                async () => "async",
            );

            expect(result).toBe("async");
        });

        it("nests interceptors around next() and the handler", async () => {
            const calls: string[] = [];

            class InterceptorA implements Interceptor {
                async intercept(
                    _context: ExecutionContext,
                    next: () => unknown | Promise<unknown>,
                ): Promise<unknown> {
                    calls.push("A-before");
                    const result = await next();
                    calls.push("A-after");
                    return result;
                }
            }

            class InterceptorB implements Interceptor {
                async intercept(
                    _context: ExecutionContext,
                    next: () => unknown | Promise<unknown>,
                ): Promise<unknown> {
                    calls.push("B-before");
                    const result = await next();
                    calls.push("B-after");
                    return result;
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({ token: InterceptorA, useClass: InterceptorA });
            container.register({ token: InterceptorB, useClass: InterceptorB });

            const registry = new InterceptorRegistry(container);
            const metadata = new InterceptorMetadata();
            const executor = new InterceptorExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [InterceptorA],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [InterceptorB],
                UserController.prototype,
                "getUser",
            );

            const result = await executor.execute(
                handler,
                execution,
                () => {
                    calls.push("handler");
                    return "ok";
                },
            );

            expect(result).toBe("ok");
            expect(calls).toEqual([
                "A-before",
                "B-before",
                "handler",
                "B-after",
                "A-after",
            ]);
        });

        it("runs before and after around next()", async () => {
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
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: TimingInterceptor,
                useClass: TimingInterceptor,
            });

            const registry = new InterceptorRegistry(container);
            const metadata = new InterceptorMetadata();
            const executor = new InterceptorExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [TimingInterceptor],
                UserController,
            );

            await executor.execute(
                handler,
                execution,
                () => {
                    calls.push("next");
                    return "ok";
                },
            );

            expect(calls).toEqual(["before", "next", "after"]);
        });

        it("propagates interceptor errors", async () => {
            class FailingInterceptor implements Interceptor {
                intercept(): unknown {
                    throw new Error("interceptor failed");
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: FailingInterceptor,
                useClass: FailingInterceptor,
            });

            const registry = new InterceptorRegistry(container);
            const metadata = new InterceptorMetadata();
            const executor = new InterceptorExecutor(metadata, registry);

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
                executor.execute(handler, execution, () => "ok"),
            ).rejects.toThrow("interceptor failed");
        });

        it("propagates errors from next()", async () => {
            class PassThroughInterceptor implements Interceptor {
                intercept(
                    _context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    return next();
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: PassThroughInterceptor,
                useClass: PassThroughInterceptor,
            });

            const registry = new InterceptorRegistry(container);
            const metadata = new InterceptorMetadata();
            const executor = new InterceptorExecutor(metadata, registry);

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
                executor.execute(handler, execution, () => {
                    throw new Error("handler failed");
                }),
            ).rejects.toThrow("handler failed");
        });

        it("resolves interceptors from the registry through DI", async () => {
            function Injectable(): ClassDecorator {
                return (target) => target;
            }

            @Injectable()
            class Dependency {
                public readonly value = "injected";
            }

            @Injectable()
            class InjectedInterceptor implements Interceptor {
                public constructor(
                    private readonly dependency: Dependency,
                ) {}

                intercept(
                    context: ExecutionContext,
                    next: () => unknown,
                ): unknown {
                    context.set("dependency", this.dependency.value);
                    return next();
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({ token: Dependency, useClass: Dependency });
            container.register({
                token: InjectedInterceptor,
                useClass: InjectedInterceptor,
            });

            const registry = new InterceptorRegistry(container);
            const metadata = new InterceptorMetadata();
            const executor = new InterceptorExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.INTERCEPTOR,
                [InjectedInterceptor],
                UserController,
            );

            const result = await executor.execute(
                handler,
                execution,
                () => "ok",
            );

            expect(result).toBe("ok");
            expect(execution.get("dependency")).toBe("injected");
            expect(registry.has(InjectedInterceptor)).toBe(true);
        });
    });
});
