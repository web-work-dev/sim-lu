import { Controller, Get, On, OnMessage } from "@sim-lu/common";

import { describe, expect, it } from "vitest";

import { ControllerRef } from "../src/controller/controller-ref.js";
import { HandlerResolver } from "../src/execution/handler-resolve.js";
import { HandlerRef } from "../src/execution/handler-ref.js";

describe("HandlerResolver", () => {
    // ─── HTTP ──────────────────────────────────────────────────

    describe("HTTP", () => {
        @Controller("/users")
        class UserController {
            @Get()
            public getUsers(): string {
                return "users";
            }
        }

        it("resolves @Get()", () => {
            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const resolver = new HandlerResolver();

            const handlers = resolver.resolveHttpHandlers(ref);

            expect(handlers.length).toBe(1);
            expect(handlers[0]).toBeInstanceOf(HandlerRef);
        });

        it("preserves method/path metadata", () => {
            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const resolver = new HandlerResolver();

            const handlers = resolver.resolveHttpHandlers(ref);

            expect(handlers[0].method).toBe("getUsers");
        });

        it("HandlerRef.invoke() works", () => {
            const controller = new UserController();
            const ref = new ControllerRef(UserController, controller);
            const resolver = new HandlerResolver();

            const handlers = resolver.resolveHttpHandlers(ref);

            expect(handlers[0].invoke()).toBe("users");
        });
    });

    // ─── WebSocket ─────────────────────────────────────────────

    describe("WebSocket", () => {
        @Controller("/ws")
        class WsController {
            @OnMessage()
            public onMessage(): string {
                return "message";
            }

            @On("event")
            public onEvent(): string {
                return "event";
            }
        }

        it("resolves @OnMessage()", () => {
            const controller = new WsController();
            const ref = new ControllerRef(WsController, controller);
            const resolver = new HandlerResolver();

            const handlers = resolver.resolveWebSocketHandlers(ref);

            const messageHandler = handlers.find(
                (h) => h.method === "onMessage",
            );
            expect(messageHandler).toBeDefined();
            expect(messageHandler!).toBeInstanceOf(HandlerRef);
        });

        it("resolves @On('event')", () => {
            const controller = new WsController();
            const ref = new ControllerRef(WsController, controller);
            const resolver = new HandlerResolver();

            const handlers = resolver.resolveWebSocketHandlers(ref);

            const eventHandler = handlers.find(
                (h) => h.method === "onEvent",
            );
            expect(eventHandler).toBeDefined();
            expect(eventHandler!).toBeInstanceOf(HandlerRef);
        });

        it("preserves event metadata", () => {
            const controller = new WsController();
            const ref = new ControllerRef(WsController, controller);
            const resolver = new HandlerResolver();

            const handlers = resolver.resolveWebSocketHandlers(ref);

            const messageHandler = handlers.find(
                (h) => h.method === "onMessage",
            );
            expect(messageHandler).toBeDefined();
            expect(messageHandler!.method).toBe("onMessage");
        });
    });

    // ─── No metadata ───────────────────────────────────────────

    describe("No metadata", () => {
        @Controller("/empty")
        class EmptyController {}

        it("HTTP → []", () => {
            const controller = new EmptyController();
            const ref = new ControllerRef(EmptyController, controller);
            const resolver = new HandlerResolver();

            const handlers = resolver.resolveHttpHandlers(ref);

            expect(handlers).toEqual([]);
        });

        it("WebSocket → []", () => {
            const controller = new EmptyController();
            const ref = new ControllerRef(EmptyController, controller);
            const resolver = new HandlerResolver();

            const handlers = resolver.resolveWebSocketHandlers(ref);

            expect(handlers).toEqual([]);
        });
    });
});
