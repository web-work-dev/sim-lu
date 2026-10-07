import { describe, expect, it, beforeEach } from "vitest";

import { Controller, METADATA_KEYS } from "@sim-lu/common";

import { ParameterMetadataResolver } from "../src/parameter/parameter-metadata.js";
import { ParameterResolver } from "../src/parameter/parameter-resolver.js";
import { ParameterPipeExecutor } from "../src/parameter/parameter-pipe-executor.js";
import { ControllerRef } from "../src/controller/controller-ref.js";
import { Container } from "../src/container/container.js";
import { ExecutionContext } from "../src/execution/execution-context.js";
import { HandlerRef } from "../src/execution/handler-ref.js";
import { Pipe } from "../src/pipe/pipe.js";
import { PipeRegistry } from "../src/pipe/pipe-registry.js";

describe("Parameter", () => {
    // ─── ParameterResolver ─────────────────────────────

    describe("ParameterResolver", () => {
        it("returns empty array when no parameters", () => {
            class UserController {
                public getUser() {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            const result = resolver.resolve(handler, execution);

            expect(result).toEqual([]);
        });

        it("resolves context parameter", () => {
            class UserController {
                public getUser(_context: ExecutionContext) {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "context", index: 0, handler: "getUser" }],
                UserController,
            );

            const result = resolver.resolve(handler, execution);

            expect(result.length).toBe(1);
            expect(result[0]).toBe(execution);
        });

        it("resolves request parameter", () => {
            class UserController {
                public getUser(_request: unknown) {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            execution.set("request", { url: "/users" });

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "request", index: 0, handler: "getUser" }],
                UserController,
            );

            const result = resolver.resolve(handler, execution);

            expect(result.length).toBe(1);
            expect(result[0]).toEqual({ url: "/users" });
        });

        it("resolves body parameter", () => {
            class UserController {
                public getUser(_body: unknown) {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            execution.set("body", { name: "John" });

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "body", index: 0, handler: "getUser" }],
                UserController,
            );

            const result = resolver.resolve(handler, execution);

            expect(result.length).toBe(1);
            expect(result[0]).toEqual({ name: "John" });
        });

        it("resolves param parameter", () => {
            class UserController {
                public getUser(_id: unknown) {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

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

            const result = resolver.resolve(handler, execution);

            expect(result.length).toBe(1);
            expect(result[0]).toBe("123");
        });

        it("resolves query parameter", () => {
            class UserController {
                public getUser(_page: unknown) {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            execution.set("query", { page: "1" });

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "query", index: 0, name: "page", handler: "getUser" }],
                UserController,
            );

            const result = resolver.resolve(handler, execution);

            expect(result.length).toBe(1);
            expect(result[0]).toBe("1");
        });

        it("returns default value when parameter is missing", () => {
            class UserController {
                public getUser(_name: unknown) {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "query", index: 0, name: "name", default: "world", handler: "getUser" }],
                UserController,
            );

            const result = resolver.resolve(handler, execution);

            expect(result.length).toBe(1);
            expect(result[0]).toBe("world");
        });

        it("throws when required parameter is missing", () => {
            class UserController {
                public getUser(_name: unknown) {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "query", index: 0, name: "name", required: true, handler: "getUser" }],
                UserController,
            );

            expect(() => resolver.resolve(handler, execution)).toThrow(
                /Required parameter "name" is missing/,
            );
        });

        it("resolves header parameter", () => {
            class UserController {
                public getUser(_auth: unknown) {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            execution.set("headers", { authorization: "Bearer token" });

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "header", index: 0, name: "authorization", handler: "getUser" }],
                UserController,
            );

            const result = resolver.resolve(handler, execution);

            expect(result.length).toBe(1);
            expect(result[0]).toBe("Bearer token");
        });

        it("resolves cookie parameter", () => {
            class UserController {
                public getUser(_sessionId: unknown) {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            execution.set("cookies", { sessionId: "abc123" });

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "cookie", index: 0, name: "sessionId", handler: "getUser" }],
                UserController,
            );

            const result = resolver.resolve(handler, execution);

            expect(result.length).toBe(1);
            expect(result[0]).toBe("abc123");
        });

        it("resolves session parameter", () => {
            class UserController {
                public getUser(_session: unknown) {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            execution.set("session", { userId: "1" });

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "session", index: 0, handler: "getUser" }],
                UserController,
            );

            const result = resolver.resolve(handler, execution);

            expect(result.length).toBe(1);
            expect(result[0]).toEqual({ userId: "1" });
        });

        it("resolves response parameter", () => {
            class UserController {
                public getUser(_response: unknown) {}
            }

            const container = new Container();
            const metadata = new ParameterMetadataResolver();
            const resolver = new ParameterResolver(metadata);

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");
            const execution = new ExecutionContext(handler, "http");
            const mockResponse = { status: 200 };
            execution.set("response", mockResponse);

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [{ type: "response", index: 0, handler: "getUser" }],
                UserController,
            );

            const result = resolver.resolve(handler, execution);

            expect(result.length).toBe(1);
            expect(result[0]).toBe(mockResponse);
        });
    });

    // ─── ParameterMetadataResolver ─────────────────────────

    describe("ParameterMetadataResolver", () => {
        let metadata: ParameterMetadataResolver;

        beforeEach(() => {
            metadata = new ParameterMetadataResolver();
        });

        it("getParameters returns parameters from class constructor", () => {
            class UserController {
                public getUser(_id: unknown) {}
            }

            Reflect.defineMetadata(
                METADATA_KEYS.PARAM,
                [
                    { type: "param", index: 0, name: "id", handler: "getUser" },
                    { type: "query", index: 1, name: "page", handler: "getUser" },
                ],
                UserController,
            );

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            const result = metadata.getParameters(handler);

            expect(result.length).toBe(2);
        });

        it("getParameters returns empty when no parameters", () => {
            @Controller("/users")
            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            const result = metadata.getParameters(handler);

            expect(result).toEqual([]);
        });

        it("getPipes returns handler-level pipes", () => {
            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            Reflect.defineMetadata(
                METADATA_KEYS.PARAMETER_PIPES,
                [{ index: 0, pipe: class {} }],
                UserController.prototype,
                "getUser",
            );

            const result = metadata.getPipes(handler);

            expect(result.length).toBe(1);
        });

        it("getPipes returns empty when no pipes", () => {
            @Controller("/users")
            class UserController {
                public getUser() {}
            }

            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const handler = new HandlerRef(ref, "getUser");

            const result = metadata.getPipes(handler);

            expect(result).toEqual([]);
        });
    });

    // ─── ParameterPipeExecutor ────────────────────────────

    describe("ParameterPipeExecutor", () => {
        it("transforms args through pipes", async () => {
            class UpperPipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            const container = new Container();
            container.register({ token: UpperPipe, useClass: UpperPipe });

            const registry = new PipeRegistry(container);
            const executor = new ParameterPipeExecutor(registry);

            const args = ["hello"];
            const pipes = [{ index: 0, pipe: UpperPipe }];
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");

            const result = await executor.execute(args, pipes, execution);

            expect(result).toEqual(["HELLO"]);
        });

        it("supports async pipes", async () => {
            class AsyncPipe implements Pipe<string, string> {
                async transform(value: string): Promise<string> {
                    return value.toUpperCase();
                }
            }

            const container = new Container();
            container.register({ token: AsyncPipe, useClass: AsyncPipe });

            const registry = new PipeRegistry(container);
            const executor = new ParameterPipeExecutor(registry);

            const args = ["hello"];
            const pipes = [{ index: 0, pipe: AsyncPipe }];
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");

            const result = await executor.execute(args, pipes, execution);

            expect(result).toEqual(["HELLO"]);
        });

        it("transforms multiple args at different indices", async () => {
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

            const container = new Container();
            container.register({ token: UpperPipe, useClass: UpperPipe });
            container.register({ token: ReversePipe, useClass: ReversePipe });

            const registry = new PipeRegistry(container);
            const executor = new ParameterPipeExecutor(registry);

            const args = ["hello", "world"];
            const pipes = [
                { index: 0, pipe: UpperPipe },
                { index: 1, pipe: ReversePipe },
            ];
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");

            const result = await executor.execute(args, pipes, execution);

            expect(result).toEqual(["HELLO", "dlrow"]);
        });

        it("leaves args unchanged when no pipes", async () => {
            const container = new Container();
            const registry = new PipeRegistry(container);
            const executor = new ParameterPipeExecutor(registry);

            const args = ["hello", "world"];
            const pipes: { index: number; pipe: Function }[] = [];
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");

            const result = await executor.execute(args, pipes, execution);

            expect(result).toEqual(["hello", "world"]);
        });

        it("returns new array with modified values", async () => {
            class UpperPipe implements Pipe<string, string> {
                transform(value: string): string {
                    return value.toUpperCase();
                }
            }

            const container = new Container();
            container.register({ token: UpperPipe, useClass: UpperPipe });

            const registry = new PipeRegistry(container);
            const executor = new ParameterPipeExecutor(registry);

            const args = ["hello"];
            const pipes = [{ index: 0, pipe: UpperPipe }];
            const handlerRef = {} as HandlerRef;
            const execution = new ExecutionContext(handlerRef, "http");

            const result = await executor.execute(args, pipes, execution);

            expect(result).not.toBe(args);
            expect(result[0]).toBe("HELLO");
        });
    });
});
