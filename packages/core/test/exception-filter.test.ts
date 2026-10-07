import { describe, expect, it, beforeEach } from "vitest";

import { Controller, METADATA_KEYS } from "@sim-lu/common";

import { ExceptionFilter } from "../src/exception-filter/exception-filter.js";
import { ExceptionFilterContext } from "../src/exception-filter/exception-filter-context.js";
import { ExceptionFilterExecutor } from "../src/exception-filter/exception-filter-executor.js";
import { ExceptionFilterMetadata } from "../src/exception-filter/exception-filter-metadata.js";
import { ExceptionFilterRegistry } from "../src/exception-filter/exception-filter-registry.js";
import { ControllerRef } from "../src/controller/controller-ref.js";
import { Container } from "../src/container/container.js";
import { ExecutionContext } from "../src/execution/execution-context.js";
import { HandlerRef } from "../src/execution/handler-ref.js";

describe("ExceptionFilter", () => {
    describe("ExceptionFilterRegistry", () => {
        it("registers an exception filter", async () => {
            const container = new Container();
            const registry = new ExceptionFilterRegistry(container);

            class HttpExceptionFilter implements ExceptionFilter {
                catch(exception: unknown): unknown {
                    return exception;
                }
            }

            container.register({
                token: HttpExceptionFilter,
                useClass: HttpExceptionFilter,
            });
            await registry.register(HttpExceptionFilter);

            expect(registry.has(HttpExceptionFilter)).toBe(true);
        });

        it("retrieves a registered exception filter", async () => {
            const container = new Container();
            const registry = new ExceptionFilterRegistry(container);

            class HttpExceptionFilter implements ExceptionFilter {
                catch(exception: unknown): unknown {
                    return exception;
                }
            }

            container.register({
                token: HttpExceptionFilter,
                useClass: HttpExceptionFilter,
            });
            const filter = await registry.register(HttpExceptionFilter);

            expect(registry.get(HttpExceptionFilter)).toBe(filter);
        });

        it("throws when retrieving unregistered exception filter", () => {
            const container = new Container();
            const registry = new ExceptionFilterRegistry(container);

            class HttpExceptionFilter implements ExceptionFilter {
                catch(exception: unknown): unknown {
                    return exception;
                }
            }

            expect(() => registry.get(HttpExceptionFilter)).toThrow(
                /Exception filter not found for token: HttpExceptionFilter/,
            );
        });

        it("returns false for unregistered token in has()", () => {
            const container = new Container();
            const registry = new ExceptionFilterRegistry(container);

            class HttpExceptionFilter implements ExceptionFilter {
                catch(exception: unknown): unknown {
                    return exception;
                }
            }

            expect(registry.has(HttpExceptionFilter)).toBe(false);
        });
    });

    describe("ExceptionFilterMetadata", () => {
        let metadata: ExceptionFilterMetadata;

        beforeEach(() => {
            metadata = new ExceptionFilterMetadata();
        });

        it("returns no filters when none are defined", () => {
            @Controller("/users")
            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            expect(metadata.getControllerFilters(controller)).toEqual([]);
            expect(metadata.getHandlerFilters(handler)).toEqual([]);
            expect(metadata.getFilters(handler)).toEqual([]);
        });

        it("returns class-level filters", () => {
            class HttpExceptionFilter {}

            class UserController {
                public getUser() {}
            }

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [HttpExceptionFilter],
                UserController,
            );

            const controller = new UserController();
            const filters = metadata.getControllerFilters(controller);

            expect(filters).toEqual([HttpExceptionFilter]);
        });

        it("returns method-level filters", () => {
            class HttpExceptionFilter {}

            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [HttpExceptionFilter],
                UserController.prototype,
                "getUser",
            );

            const filters = metadata.getHandlerFilters(handler);

            expect(filters).toEqual([HttpExceptionFilter]);
        });

        it("orders class filters before method filters", () => {
            class ClassFilter {}
            class MethodFilter {}

            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [ClassFilter],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [MethodFilter],
                UserController.prototype,
                "getUser",
            );

            expect(metadata.getFilters(handler)).toEqual([
                ClassFilter,
                MethodFilter,
            ]);
        });

        it("preserves multiple filter order", () => {
            class FirstFilter {}
            class SecondFilter {}
            class ThirdFilter {}

            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [FirstFilter, SecondFilter],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [ThirdFilter],
                UserController.prototype,
                "getUser",
            );

            expect(metadata.getFilters(handler)).toEqual([
                FirstFilter,
                SecondFilter,
                ThirdFilter,
            ]);
        });

        it("inherits class-level filters from a parent controller", () => {
            class ParentFilter {}

            class ParentController {
                public getUser() {}
            }

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [ParentFilter],
                ParentController,
            );

            class ChildController extends ParentController {}

            const controller = new ChildController();
            const filters = metadata.getControllerFilters(controller);

            expect(filters).toEqual([ParentFilter]);
        });

        it("inherits method-level filters from a parent prototype", () => {
            class ParentFilter {}

            class ParentController {
                public getUser() {}
            }

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [ParentFilter],
                ParentController.prototype,
                "getUser",
            );

            class ChildController extends ParentController {}

            const controller = new ChildController();
            const ref = new ControllerRef(ChildController, controller);
            const handler = new HandlerRef(ref, "getUser");

            expect(metadata.getHandlerFilters(handler)).toEqual([
                ParentFilter,
            ]);
        });

        it("returns catch types from filter metadata", () => {
            class HttpException {}
            class HttpExceptionFilter {}

            Reflect.defineMetadata(
                METADATA_KEYS.CATCH,
                [HttpException],
                HttpExceptionFilter,
            );

            expect(metadata.getCatchTypes(HttpExceptionFilter)).toEqual([
                HttpException,
            ]);
        });

        it("returns an empty catch type list when none are defined", () => {
            class CatchAllFilter {}

            expect(metadata.getCatchTypes(CatchAllFilter)).toEqual([]);
        });
    });

    describe("ExceptionFilterContext", () => {
        it("exposes handler, transport, and exception", () => {
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");
            const error = new Error("boom");
            const context = new ExceptionFilterContext(execution, error);

            expect(context.handler).toBe(handlerRef);
            expect(context.transport).toBe("http");
            expect(context.exception).toBe(error);
        });

        it("delegates state operations to ExecutionContext", () => {
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");
            const context = new ExceptionFilterContext(
                execution,
                new Error("boom"),
            );

            context.set("key", "value");

            expect(context.get<string>("key")).toBe("value");
            expect(context.has("key")).toBe(true);
            expect(context.getState().has("key")).toBe(true);
            expect(context.delete("key")).toBe(true);
            expect(context.has("key")).toBe(false);
        });
    });

    describe("ExceptionFilterExecutor", () => {
        it("rethrows when no filters are defined", async () => {
            class UserController {
                public getUser() {}
            }

            const container = new Container();
            const registry = new ExceptionFilterRegistry(container);
            const metadata = new ExceptionFilterMetadata();
            const executor = new ExceptionFilterExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            const error = new Error("unhandled");

            await expect(
                executor.execute(error, handler, execution),
            ).rejects.toThrow("unhandled");
        });

        it("catches an exception with a class-level filter", async () => {
            class HttpExceptionFilter implements ExceptionFilter {
                catch(exception: unknown): unknown {
                    return `caught:${String((exception as Error).message)}`;
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: HttpExceptionFilter,
                useClass: HttpExceptionFilter,
            });

            const registry = new ExceptionFilterRegistry(container);
            const metadata = new ExceptionFilterMetadata();
            const executor = new ExceptionFilterExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [HttpExceptionFilter],
                UserController,
            );

            const result = await executor.execute(
                new Error("boom"),
                handler,
                execution,
            );

            expect(result).toBe("caught:boom");
        });

        it("prefers method-level filters over class-level filters", async () => {
            const calls: string[] = [];

            class ClassFilter implements ExceptionFilter {
                catch(): unknown {
                    calls.push("class");
                    return "class";
                }
            }

            class MethodFilter implements ExceptionFilter {
                catch(): unknown {
                    calls.push("method");
                    return "method";
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({ token: ClassFilter, useClass: ClassFilter });
            container.register({ token: MethodFilter, useClass: MethodFilter });

            const registry = new ExceptionFilterRegistry(container);
            const metadata = new ExceptionFilterMetadata();
            const executor = new ExceptionFilterExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [ClassFilter],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [MethodFilter],
                UserController.prototype,
                "getUser",
            );

            const result = await executor.execute(
                new Error("boom"),
                handler,
                execution,
            );

            expect(result).toBe("method");
            expect(calls).toEqual(["method"]);
        });

        it("supports sync filters", async () => {
            class SyncFilter implements ExceptionFilter {
                catch(): unknown {
                    return "sync";
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({ token: SyncFilter, useClass: SyncFilter });

            const registry = new ExceptionFilterRegistry(container);
            const metadata = new ExceptionFilterMetadata();
            const executor = new ExceptionFilterExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [SyncFilter],
                UserController,
            );

            const result = await executor.execute(
                new Error("boom"),
                handler,
                execution,
            );

            expect(result).toBe("sync");
        });

        it("supports async filters", async () => {
            class AsyncFilter implements ExceptionFilter {
                async catch(): Promise<unknown> {
                    return "async";
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({ token: AsyncFilter, useClass: AsyncFilter });

            const registry = new ExceptionFilterRegistry(container);
            const metadata = new ExceptionFilterMetadata();
            const executor = new ExceptionFilterExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [AsyncFilter],
                UserController,
            );

            const result = await executor.execute(
                new Error("boom"),
                handler,
                execution,
            );

            expect(result).toBe("async");
        });

        it("matches catch types and skips non-matching filters", async () => {
            class HttpException extends Error {}
            class ValidationException extends Error {}

            class HttpExceptionFilter implements ExceptionFilter {
                catch(): unknown {
                    return "http";
                }
            }

            class ValidationExceptionFilter implements ExceptionFilter {
                catch(): unknown {
                    return "validation";
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: HttpExceptionFilter,
                useClass: HttpExceptionFilter,
            });
            container.register({
                token: ValidationExceptionFilter,
                useClass: ValidationExceptionFilter,
            });

            const registry = new ExceptionFilterRegistry(container);
            const metadata = new ExceptionFilterMetadata();
            const executor = new ExceptionFilterExecutor(metadata, registry);

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
                METADATA_KEYS.CATCH,
                [ValidationException],
                ValidationExceptionFilter,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [HttpExceptionFilter, ValidationExceptionFilter],
                UserController,
            );

            const result = await executor.execute(
                new ValidationException("invalid"),
                handler,
                execution,
            );

            expect(result).toBe("validation");
        });

        it("rethrows when no catch type matches", async () => {
            class HttpException extends Error {}

            class HttpExceptionFilter implements ExceptionFilter {
                catch(): unknown {
                    return "http";
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: HttpExceptionFilter,
                useClass: HttpExceptionFilter,
            });

            const registry = new ExceptionFilterRegistry(container);
            const metadata = new ExceptionFilterMetadata();
            const executor = new ExceptionFilterExecutor(metadata, registry);

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
                executor.execute(new Error("unhandled"), handler, execution),
            ).rejects.toThrow("unhandled");
        });

        it("treats filters without catch types as catch-all", async () => {
            class CatchAllFilter implements ExceptionFilter {
                catch(): unknown {
                    return "all";
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: CatchAllFilter,
                useClass: CatchAllFilter,
            });

            const registry = new ExceptionFilterRegistry(container);
            const metadata = new ExceptionFilterMetadata();
            const executor = new ExceptionFilterExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [CatchAllFilter],
                UserController,
            );

            const result = await executor.execute(
                new TypeError("boom"),
                handler,
                execution,
            );

            expect(result).toBe("all");
        });

        it("resolves filters from the registry through DI", async () => {
            function Injectable(): ClassDecorator {
                return (target) => target;
            }

            @Injectable()
            class Dependency {
                public readonly value = "injected";
            }

            @Injectable()
            class InjectedFilter implements ExceptionFilter {
                public constructor(
                    private readonly dependency: Dependency,
                ) {}

                catch(
                    exception: unknown,
                    context: ExecutionContext,
                ): unknown {
                    context.set("dependency", this.dependency.value);
                    return `caught:${this.dependency.value}`;
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({ token: Dependency, useClass: Dependency });
            container.register({
                token: InjectedFilter,
                useClass: InjectedFilter,
            });

            const registry = new ExceptionFilterRegistry(container);
            const metadata = new ExceptionFilterMetadata();
            const executor = new ExceptionFilterExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [InjectedFilter],
                UserController,
            );

            const result = await executor.execute(
                new Error("boom"),
                handler,
                execution,
            );

            expect(result).toBe("caught:injected");
            expect(execution.get("dependency")).toBe("injected");
            expect(registry.has(InjectedFilter)).toBe(true);
        });

        it("propagates errors thrown by a filter", async () => {
            class FailingFilter implements ExceptionFilter {
                catch(): unknown {
                    throw new Error("filter failed");
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: FailingFilter,
                useClass: FailingFilter,
            });

            const registry = new ExceptionFilterRegistry(container);
            const metadata = new ExceptionFilterMetadata();
            const executor = new ExceptionFilterExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [FailingFilter],
                UserController,
            );

            await expect(
                executor.execute(new Error("boom"), handler, execution),
            ).rejects.toThrow("filter failed");
        });
    });
});
