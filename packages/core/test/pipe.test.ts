import { describe, expect, it, beforeEach } from "vitest";

import { Controller, METADATA_KEYS } from "@sim-lu/common";

import { Pipe } from "../src/pipe/pipe.js";
import { PipeContext } from "../src/pipe/pipe-context.js";
import { PipeExecutor } from "../src/pipe/pipe-executor.js";
import { PipeMetadata } from "../src/pipe/pipe-metadata.js";
import { PipeRegistry } from "../src/pipe/pipe-registry.js";
import { ControllerRef } from "../src/controller/controller-ref.js";
import { Container } from "../src/container/container.js";
import { ExecutionContext } from "../src/execution/execution-context.js";
import { HandlerRef } from "../src/execution/handler-ref.js";

describe("Pipe", () => {
    // ─── PipeRegistry ────────────────────────────────────

    describe("PipeRegistry", () => {
        it("registers a pipe", async () => {
            const container = new Container();
            const registry = new PipeRegistry(container);

            class UpperPipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            container.register({ token: UpperPipe, useClass: UpperPipe });
            await registry.register(UpperPipe);

            expect(registry.has(UpperPipe)).toBe(true);
        });

        it("retrieves a registered pipe", async () => {
            const container = new Container();
            const registry = new PipeRegistry(container);

            class UpperPipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            container.register({ token: UpperPipe, useClass: UpperPipe });
            const pipe = await registry.register(UpperPipe);

            expect(registry.get(UpperPipe)).toBe(pipe);
        });

        it("throws when retrieving unregistered pipe", () => {
            const container = new Container();
            const registry = new PipeRegistry(container);

            class UpperPipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            expect(() => registry.get(UpperPipe)).toThrow(
                /Pipe not found for token: UpperPipe/,
            );
        });

        it("returns false for unregistered token in has()", () => {
            const container = new Container();
            const registry = new PipeRegistry(container);

            class UpperPipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            expect(registry.has(UpperPipe)).toBe(false);
        });

        it("returns all pipes via getAll()", async () => {
            const container = new Container();
            const registry = new PipeRegistry(container);

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

            container.register({ token: UpperPipe, useClass: UpperPipe });
            container.register({ token: ReversePipe, useClass: ReversePipe });

            await registry.register(UpperPipe);
            await registry.register(ReversePipe);

            const all = registry.getAll();

            expect(all.size).toBe(2);
        });

        it("separates registrations between containers", async () => {
            const containerA = new Container();
            const containerB = new Container();
            const registryA = new PipeRegistry(containerA);
            const registryB = new PipeRegistry(containerB);

            class UpperPipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            containerA.register({ token: UpperPipe, useClass: UpperPipe });

            await registryA.register(UpperPipe);

            expect(registryA.has(UpperPipe)).toBe(true);
            expect(registryB.has(UpperPipe)).toBe(false);
        });
    });

    // ─── PipeMetadata ────────────────────────────────────

    describe("PipeMetadata", () => {
        let metadata: PipeMetadata;

        beforeEach(() => {
            metadata = new PipeMetadata();
        });

        it("getControllerPipes returns class-level pipes", () => {
            @Controller("/users")
            class UserController {}

            const controller = new UserController();
            const pipes = metadata.getControllerPipes(controller);

            expect(pipes).toEqual([]);
        });

        it("getControllerPipes returns class-level pipes when defined", () => {
            class UserController {}

            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [class {}],
                UserController,
            );

            const controller = new UserController();
            const pipes = metadata.getControllerPipes(controller);

            expect(pipes.length).toBe(1);
        });

        it("getControllerPipes returns empty when no pipes", () => {
            @Controller("/users")
            class UserController {}

            const controller = new UserController();
            const pipes = metadata.getControllerPipes(controller);

            expect(pipes).toEqual([]);
        });

        it("getHandlerPipes returns method-level pipes", () => {
            @Controller("/users")
            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [class {}],
                UserController.prototype,
                "getUser",
            );

            const pipes = metadata.getHandlerPipes(handler);

            expect(pipes.length).toBe(1);
        });

        it("getHandlerPipes returns empty when no pipes", () => {
            @Controller("/users")
            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            const pipes = metadata.getHandlerPipes(handler);

            expect(pipes).toEqual([]);
        });

        it("getPipes combines controller and handler pipes", () => {
            @Controller("/users")
            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [class {}],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [class {}],
                UserController.prototype,
                "getUser",
            );

            const pipes = metadata.getPipes(handler);

            expect(pipes.length).toBe(2);
        });

        it("getControllerPipes accumulates multiple metadata entries", () => {
            @Controller("/users")
            class UserController {}

            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [class {}],
                UserController,
            );

            const existing =
                Reflect.getMetadata(METADATA_KEYS.PIPE, UserController) ?? [];
            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [...existing, class {}],
                UserController,
            );

            const controller = new UserController();
            const pipes = metadata.getControllerPipes(controller);

            expect(pipes.length).toBe(2);
        });

        it("getHandlerPipes accumulates multiple metadata entries", () => {
            @Controller("/users")
            class UserController {
                public getUser() {}
            }

            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [class {}],
                UserController.prototype,
                "getUser",
            );

            const existing = Reflect.getMetadata(
                METADATA_KEYS.PIPE,
                UserController.prototype,
                "getUser",
            ) ?? [];
            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [...existing, class {}],
                UserController.prototype,
                "getUser",
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            const pipes = metadata.getHandlerPipes(handler);

            expect(pipes.length).toBe(2);
        });
    });

    // ─── PipeContext ─────────────────────────────────────────────

    describe("PipeContext", () => {
        it("exposes handler from ExecutionContext", () => {
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");
            const context = new PipeContext(execution);

            expect(context.handler).toBe(handlerRef);
        });

        it("exposes transport from ExecutionContext", () => {
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");
            const context = new PipeContext(execution);

            expect(context.transport).toBe("http");
        });

        it("delegates set to ExecutionContext", () => {
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");
            const context = new PipeContext(execution);

            context.set("key", "value");

            expect(execution.get("key")).toBe("value");
        });

        it("delegates get to ExecutionContext", () => {
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");
            const context = new PipeContext(execution);

            execution.set("key", "value");

            expect(context.get<string>("key")).toBe("value");
        });

        it("delegates getState to ExecutionContext", () => {
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");
            const context = new PipeContext(execution);

            execution.set("key", "value");

            expect(context.getState().has("key")).toBe(true);
        });
    });

    // ─── PipeExecutor ────────────────────────────────────

    describe("PipeExecutor", () => {
        it("transforms value through pipes", async () => {
            class UpperPipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({ token: UpperPipe, useClass: UpperPipe });

            const registry = new PipeRegistry(container);
            const metadata = new PipeMetadata();
            const executor = new PipeExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            const context = new PipeContext(execution);

            Reflect.defineMetadata(METADATA_KEYS.PIPE, [UpperPipe], UserController);
            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [UpperPipe],
                UserController.prototype,
                "getUser",
            );

            const result = await executor.execute("hello", handler, context);

            expect(result).toBe("HELLO");
        });

        it("supports async pipes", async () => {
            class AsyncPipe implements Pipe<string, string> {
                async transform(value: string): Promise<string> {
                    return value.toUpperCase();
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({ token: AsyncPipe, useClass: AsyncPipe });

            const registry = new PipeRegistry(container);
            const metadata = new PipeMetadata();
            const executor = new PipeExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            const context = new PipeContext(execution);

            Reflect.defineMetadata(METADATA_KEYS.PIPE, [AsyncPipe], UserController);
            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [AsyncPipe],
                UserController.prototype,
                "getUser",
            );

            const result = await executor.execute("hello", handler, context);

            expect(result).toBe("HELLO");
        });

        it("chains multiple pipes", async () => {
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
                public getUser() {}
            }

            const container = new Container();
            container.register({ token: UpperPipe, useClass: UpperPipe });
            container.register({ token: ReversePipe, useClass: ReversePipe });

            const registry = new PipeRegistry(container);
            const metadata = new PipeMetadata();
            const executor = new PipeExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            const context = new PipeContext(execution);

            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [UpperPipe],
                UserController,
            );
            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [ReversePipe],
                UserController.prototype,
                "getUser",
            );

            const result = await executor.execute("hello", handler, context);

            expect(result).toBe("OLLEH");
        });

        it("returns original value when no pipes", async () => {
            class UserController {
                public getUser() {}
            }

            const container = new Container();
            const registry = new PipeRegistry(container);
            const metadata = new PipeMetadata();
            const executor = new PipeExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            const context = new PipeContext(execution);

            const result = await executor.execute("hello", handler, context);

            expect(result).toBe("hello");
        });

        it("resolves pipes from registry", async () => {
            class UpperPipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            class UserController {
                public getUser() {}
            }

            const container = new Container();
            container.register({ token: UpperPipe, useClass: UpperPipe });

            const registry = new PipeRegistry(container);
            const metadata = new PipeMetadata();
            const executor = new PipeExecutor(metadata, registry);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            const context = new PipeContext(execution);

            Reflect.defineMetadata(METADATA_KEYS.PIPE, [UpperPipe], UserController);

            const result = await executor.execute("hello", handler, context);

            expect(result).toBe("HELLO");
            expect(registry.has(UpperPipe)).toBe(true);
        });
    });
});
