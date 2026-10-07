import { describe, expect, it } from "vitest";

import { METADATA_KEYS } from "@sim-lu/common";
import { ForbiddenException } from "@sim-lu/error";

import { Guard } from "../src/guard/guard.js";
import { GuardContext } from "../src/guard/guard-context.js";
import { GuardExecutor } from "../src/guard/guard-executor.js";
import { GuardMetadata } from "../src/guard/guard-metadata.js";
import { GuardRegistry } from "../src/guard/guard-registry.js";
import { ControllerRef } from "../src/controller/controller-ref.js";
import { Container } from "../src/container/container.js";
import { ExecutionContext } from "../src/execution/execution-context.js";
import { HandlerRef } from "../src/execution/handler-ref.js";

describe("GuardExecutor", () => {
    it("returns true when all guards allow", async () => {
        class AllowGuard implements Guard {
            public canActivate(): boolean {
                return true;
            }
        }

        class UserController {
            public getUser() { }
        }

        Reflect.defineMetadata(METADATA_KEYS.GUARD, [AllowGuard], UserController);
        Reflect.defineMetadata(
            METADATA_KEYS.GUARD,
            [AllowGuard],
            UserController.prototype,
            "getUser",
        );

        const container = new Container();
        container.register({ token: AllowGuard, useClass: AllowGuard });

        const registry = new GuardRegistry(container);
        const metadata = new GuardMetadata();
        const executor = new GuardExecutor(metadata, registry);

        const controller = new UserController();
        const ref = new ControllerRef(UserController, controller);
        const handler = new HandlerRef(ref, "getUser");
        const execution = new ExecutionContext(handler, "http");
        const context = new GuardContext(execution);

        const result = await executor.execute(handler, context);

        expect(result).toBe(true);
    });

    it("throws ForbiddenException when a guard denies", async () => {
        class DenyGuard implements Guard {
            public canActivate(): boolean {
                return false;
            }
        }

        class UserController {
            public getUser() { }
        }

        Reflect.defineMetadata(METADATA_KEYS.GUARD, [DenyGuard], UserController);
        Reflect.defineMetadata(
            METADATA_KEYS.GUARD,
            [DenyGuard],
            UserController.prototype,
            "getUser",
        );

        const container = new Container();
        container.register({ token: DenyGuard, useClass: DenyGuard });

        const registry = new GuardRegistry(container);
        const metadata = new GuardMetadata();
        const executor = new GuardExecutor(metadata, registry);

        const controller = new UserController();
        const ref = new ControllerRef(UserController, controller);
        const handler = new HandlerRef(ref, "getUser");
        const execution = new ExecutionContext(handler, "http");
        const context = new GuardContext(execution);

        await expect(executor.execute(handler, context)).rejects.toThrow(
            ForbiddenException,
        );
    });

    it("supports async guards", async () => {
        class AsyncAllowGuard implements Guard {
            public async canActivate(): Promise<boolean> {
                return true;
            }
        }

        class UserController {
            public getUser() { }
        }

        Reflect.defineMetadata(METADATA_KEYS.GUARD, [AsyncAllowGuard], UserController);
        Reflect.defineMetadata(
            METADATA_KEYS.GUARD,
            [AsyncAllowGuard],
            UserController.prototype,
            "getUser",
        );

        const container = new Container();
        container.register({ token: AsyncAllowGuard, useClass: AsyncAllowGuard });

        const registry = new GuardRegistry(container);
        const metadata = new GuardMetadata();
        const executor = new GuardExecutor(metadata, registry);

        const controller = new UserController();
        const ref = new ControllerRef(UserController, controller);
        const handler = new HandlerRef(ref, "getUser");
        const execution = new ExecutionContext(handler, "http");
        const context = new GuardContext(execution);

        const result = await executor.execute(handler, context);

        expect(result).toBe(true);
    });

    it("returns true when no guards are defined", async () => {
        class UserController {
            public getUser() { }
        }

        const container = new Container();
        const registry = new GuardRegistry(container);
        const metadata = new GuardMetadata();
        const executor = new GuardExecutor(metadata, registry);

        const controller = new UserController();
        const ref = new ControllerRef(UserController, controller);
        const handler = new HandlerRef(ref, "getUser");
        const execution = new ExecutionContext(handler, "http");
        const context = new GuardContext(execution);

        const result = await executor.execute(handler, context);

        expect(result).toBe(true);
    });

    it("resolves guards from registry", async () => {
        class AllowGuard implements Guard {
            public canActivate(): boolean {
                return true;
            }
        }

        class UserController {
            public getUser() { }
        }

        Reflect.defineMetadata(METADATA_KEYS.GUARD, [AllowGuard], UserController);

        const container = new Container();
        container.register({ token: AllowGuard, useClass: AllowGuard });

        const registry = new GuardRegistry(container);
        const metadata = new GuardMetadata();
        const executor = new GuardExecutor(metadata, registry);

        const controller = new UserController();
        const ref = new ControllerRef(UserController, controller);
        const handler = new HandlerRef(ref, "getUser");
        const execution = new ExecutionContext(handler, "http");
        const context = new GuardContext(execution);

        const result = await executor.execute(handler, context);

        expect(result).toBe(true);
        expect(registry.has(AllowGuard)).toBe(true);
    });
    it("throws ForbiddenException after executing guards in order", async () => {
        const calls: string[] = [];

        class FirstGuard implements Guard {
            public canActivate(): boolean {
                calls.push("first");
                return true;
            }
        }

        class SecondGuard implements Guard {
            public canActivate(): boolean {
                calls.push("second");
                return false;
            }
        }

        class ThirdGuard implements Guard {
            public canActivate(): boolean {
                calls.push("third");
                return true;
            }
        }

        class UserController {
            public getUser() { }
        }

        Reflect.defineMetadata(
            METADATA_KEYS.GUARD,
            [FirstGuard, SecondGuard, ThirdGuard],
            UserController,
        );

        const container = new Container();

        container.register({
            token: FirstGuard,
            useClass: FirstGuard,
        });

        container.register({
            token: SecondGuard,
            useClass: SecondGuard,
        });

        container.register({
            token: ThirdGuard,
            useClass: ThirdGuard,
        });

        const registry = new GuardRegistry(container);
        const metadata = new GuardMetadata();
        const executor = new GuardExecutor(metadata, registry);

        const controller = new UserController();
        const ref = new ControllerRef(
            UserController,
            controller,
        );

        const handler = new HandlerRef(
            ref,
            "getUser",
        );

        const execution = new ExecutionContext(
            handler,
            "http",
        );

        const context = new GuardContext(execution);

        await expect(
            executor.execute(handler, context),
        ).rejects.toThrow(ForbiddenException);

        expect(calls).toEqual([
            "first",
            "second",
        ]);
    });
});
