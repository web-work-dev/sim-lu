import { describe, expect, it, beforeEach } from "vitest";

import { Controller, METADATA_KEYS } from "@sim-lu/common";

import { Transformer } from "../src/transform/transformer.js";
import { TransformerContext } from "../src/transform/transformer-context.js";
import { TransformerExecutor } from "../src/transform/transformer-executor.js";
import { TransformerMetadata } from "../src/transform/transformer-metadata.js";
import { TransformerRegistry } from "../src/transform/transformer-registry.js";
import { ControllerRef } from "../src/controller/controller-ref.js";
import { Container } from "../src/container/container.js";
import { ExecutionContext } from "../src/execution/execution-context.js";
import { HandlerRef } from "../src/execution/handler-ref.js";

describe("Transformer", () => {
    describe("TransformerRegistry", () => {
        it("registers a transformer", async () => {
            const container = new Container();
            const registry = new TransformerRegistry(container);

            class WrapTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { data: value };
                }
            }

            container.register({
                token: WrapTransformer,
                useClass: WrapTransformer,
            });
            await registry.register(WrapTransformer);

            expect(registry.has(WrapTransformer)).toBe(true);
        });

        it("retrieves a registered transformer", async () => {
            const container = new Container();
            const registry = new TransformerRegistry(container);

            class WrapTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { data: value };
                }
            }

            container.register({
                token: WrapTransformer,
                useClass: WrapTransformer,
            });
            const transformer = await registry.register(WrapTransformer);

            expect(registry.get(WrapTransformer)).toBe(transformer);
        });

        it("throws when retrieving unregistered transformer", () => {
            const container = new Container();
            const registry = new TransformerRegistry(container);

            class WrapTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { data: value };
                }
            }

            expect(() => registry.get(WrapTransformer)).toThrow(
                /Transformer not found for token: WrapTransformer/,
            );
        });

        it("returns false for unregistered token in has()", () => {
            const container = new Container();
            const registry = new TransformerRegistry(container);

            class WrapTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { data: value };
                }
            }

            expect(registry.has(WrapTransformer)).toBe(false);
        });

        it("returns all transformers via getAll()", async () => {
            const container = new Container();
            const registry = new TransformerRegistry(container);

            class WrapTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { data: value };
                }
            }

            class SerializeTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return JSON.stringify(value);
                }
            }

            container.register({
                token: WrapTransformer,
                useClass: WrapTransformer,
            });
            container.register({
                token: SerializeTransformer,
                useClass: SerializeTransformer,
            });

            await registry.register(WrapTransformer);
            await registry.register(SerializeTransformer);

            expect(registry.getAll().size).toBe(2);
        });
    });

    describe("TransformerMetadata", () => {
        let metadata: TransformerMetadata;

        beforeEach(() => {
            metadata = new TransformerMetadata();
        });

        it("returns no transformers when none are defined", () => {
            @Controller("/users")
            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            expect(metadata.getControllerTransformers(controller)).toEqual([]);
            expect(metadata.getHandlerTransformers(handler)).toEqual([]);
            expect(metadata.getTransformers(handler)).toEqual([]);
        });

        it("returns class-level transformers", () => {
            class WrapTransformer {}

            class UserController {
                public getUser() {}
            }

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [WrapTransformer],
                UserController,
            );

            const controller = new UserController();
            const transformers =
                metadata.getControllerTransformers(controller);

            expect(transformers).toEqual([WrapTransformer]);
        });

        it("returns method-level transformers", () => {
            class WrapTransformer {}

            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [WrapTransformer],
                UserController.prototype,
                "getUser",
            );

            const transformers = metadata.getHandlerTransformers(handler);

            expect(transformers).toEqual([WrapTransformer]);
        });

        it("orders class transformers before method transformers", () => {
            class ClassTransformer {}
            class MethodTransformer {}

            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [ClassTransformer],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [MethodTransformer],
                UserController.prototype,
                "getUser",
            );

            expect(metadata.getTransformers(handler)).toEqual([
                ClassTransformer,
                MethodTransformer,
            ]);
        });

        it("preserves multiple transformer order", () => {
            class FirstTransformer {}
            class SecondTransformer {}
            class ThirdTransformer {}

            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [FirstTransformer, SecondTransformer],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [ThirdTransformer],
                UserController.prototype,
                "getUser",
            );

            expect(metadata.getTransformers(handler)).toEqual([
                FirstTransformer,
                SecondTransformer,
                ThirdTransformer,
            ]);
        });

        it("inherits class-level transformers from a parent controller", () => {
            class ParentTransformer {}

            class ParentController {
                public getUser() {}
            }

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [ParentTransformer],
                ParentController,
            );

            class ChildController extends ParentController {}

            const controller = new ChildController();
            const transformers =
                metadata.getControllerTransformers(controller);

            expect(transformers).toEqual([ParentTransformer]);
        });

        it("inherits method-level transformers from a parent prototype", () => {
            class ParentTransformer {}

            class ParentController {
                public getUser() {}
            }

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [ParentTransformer],
                ParentController.prototype,
                "getUser",
            );

            class ChildController extends ParentController {}

            const controller = new ChildController();
            const ref = new ControllerRef(ChildController, controller);
            const handler = new HandlerRef(ref, "getUser");

            expect(metadata.getHandlerTransformers(handler)).toEqual([
                ParentTransformer,
            ]);
        });
    });

    describe("TransformerContext", () => {
        it("exposes handler and transport from ExecutionContext", () => {
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");
            const context = new TransformerContext(execution);

            expect(context.handler).toBe(handlerRef);
            expect(context.transport).toBe("http");
        });

        it("delegates state operations to ExecutionContext", () => {
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");
            const context = new TransformerContext(execution);

            context.set("key", "value");

            expect(context.get<string>("key")).toBe("value");
            expect(context.has("key")).toBe(true);
            expect(context.getState().has("key")).toBe(true);
            expect(context.delete("key")).toBe(true);
            expect(context.has("key")).toBe(false);
        });
    });

    describe("TransformerExecutor", () => {
        it("returns the original value when no transformers are defined", async () => {
            class UserController {
                public getUser() {}
            }

            const container = new Container();
            const registry = new TransformerRegistry(container);
            const metadata = new TransformerMetadata();
            const executor = new TransformerExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            const result = await executor.execute("ok", handler, execution);

            expect(result).toBe("ok");
        });

        it("transforms a return value through a class-level transformer", async () => {
            class WrapTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { data: value };
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: WrapTransformer,
                useClass: WrapTransformer,
            });

            const registry = new TransformerRegistry(container);
            const metadata = new TransformerMetadata();
            const executor = new TransformerExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [WrapTransformer],
                UserController,
            );

            const result = await executor.execute("ok", handler, execution);

            expect(result).toEqual({ data: "ok" });
        });

        it("supports sync transformers", async () => {
            class UpperTransformer implements Transformer<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: UpperTransformer,
                useClass: UpperTransformer,
            });

            const registry = new TransformerRegistry(container);
            const metadata = new TransformerMetadata();
            const executor = new TransformerExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [UpperTransformer],
                UserController,
            );

            const result = await executor.execute("ok", handler, execution);

            expect(result).toBe("OK");
        });

        it("supports async transformers", async () => {
            class AsyncTransformer implements Transformer<string, string> {
                async transform(value: string): Promise<string> {
                    return value.toUpperCase();
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: AsyncTransformer,
                useClass: AsyncTransformer,
            });

            const registry = new TransformerRegistry(container);
            const metadata = new TransformerMetadata();
            const executor = new TransformerExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [AsyncTransformer],
                UserController,
            );

            const result = await executor.execute("ok", handler, execution);

            expect(result).toBe("OK");
        });

        it("chains class then method transformers", async () => {
            class WrapTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { data: value };
                }
            }

            class StatusTransformer implements Transformer {
                transform(value: unknown): unknown {
                    return { status: "ok", payload: value };
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: WrapTransformer,
                useClass: WrapTransformer,
            });
            container.register({
                token: StatusTransformer,
                useClass: StatusTransformer,
            });

            const registry = new TransformerRegistry(container);
            const metadata = new TransformerMetadata();
            const executor = new TransformerExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [WrapTransformer],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [StatusTransformer],
                UserController.prototype,
                "getUser",
            );

            const result = await executor.execute("ok", handler, execution);

            expect(result).toEqual({
                status: "ok",
                payload: { data: "ok" },
            });
        });

        it("resolves transformers from the registry through DI", async () => {
            function Injectable(): ClassDecorator {
                return (target) => target;
            }

            @Injectable()
            class Prefix {
                public readonly value = "v1";
            }

            @Injectable()
            class InjectedTransformer implements Transformer {
                public constructor(
                    private readonly prefix: Prefix,
                ) {}

                transform(
                    value: unknown,
                    context: ExecutionContext,
                ): unknown {
                    context.set("prefix", this.prefix.value);
                    return { version: this.prefix.value, data: value };
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({ token: Prefix, useClass: Prefix });
            container.register({
                token: InjectedTransformer,
                useClass: InjectedTransformer,
            });

            const registry = new TransformerRegistry(container);
            const metadata = new TransformerMetadata();
            const executor = new TransformerExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [InjectedTransformer],
                UserController,
            );

            const result = await executor.execute("ok", handler, execution);

            expect(result).toEqual({ version: "v1", data: "ok" });
            expect(execution.get("prefix")).toBe("v1");
            expect(registry.has(InjectedTransformer)).toBe(true);
        });

        it("propagates transformer errors", async () => {
            class FailingTransformer implements Transformer {
                transform(): unknown {
                    throw new Error("transform failed");
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: FailingTransformer,
                useClass: FailingTransformer,
            });

            const registry = new TransformerRegistry(container);
            const metadata = new TransformerMetadata();
            const executor = new TransformerExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [FailingTransformer],
                UserController,
            );

            await expect(
                executor.execute("ok", handler, execution),
            ).rejects.toThrow("transform failed");
        });

        it("can read execution state while transforming", async () => {
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
                public getUser() {}
            }

            const container = new Container();
            container.register({
                token: StateTransformer,
                useClass: StateTransformer,
            });

            const registry = new TransformerRegistry(container);
            const metadata = new TransformerMetadata();
            const executor = new TransformerExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            execution.set("role", "admin");

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [StateTransformer],
                UserController,
            );

            const result = await executor.execute("ok", handler, execution);

            expect(result).toEqual({ data: "ok", role: "admin" });
        });
    });
});
