import { describe, expect, it, vi } from "vitest";

import type {
    WebSocketSocket,
    WebSocketContext,
    WebSocketMessageContext,
} from "../src/index.js";

describe("WebSocketSocket", () => {
    it("should satisfy the WebSocketSocket interface", () => {
        const socket: WebSocketSocket = {
            id: "socket-abc123",
            send: vi.fn(),
            close: vi.fn(),
            terminate: vi.fn(),
        };

        expect(socket.id).toBe("socket-abc123");

        socket.send("hello");
        expect(socket.send).toHaveBeenCalledWith("hello");

        socket.close(1000, "normal");
        expect(socket.close).toHaveBeenCalledWith(1000, "normal");

        socket.terminate();
        expect(socket.terminate).toHaveBeenCalled();
    });
});

describe("WebSocketContext", () => {
    it("should satisfy the WebSocketContext interface", () => {
        const socket: WebSocketSocket = {
            id: "socket-xyz",
            send: vi.fn(),
            close: vi.fn(),
            terminate: vi.fn(),
        };

        const ctx: WebSocketContext = {
            socket,
            params: { roomId: "room-1" },
            query: { token: "abc" },
            headers: { "sec-websocket-protocol": "chat.v1" },
            cookies: { session: "sess123" },
            state: new Map([["userId", "42"]]),
        };

        expect(ctx.socket.id).toBe("socket-xyz");
        expect(ctx.params["roomId"]).toBe("room-1");
        expect(ctx.query["token"]).toBe("abc");
        expect(ctx.cookies["session"]).toBe("sess123");
        expect(ctx.state.get("userId")).toBe("42");
    });
});

describe("WebSocketMessageContext", () => {
    it("should satisfy the WebSocketMessageContext interface with a string message", () => {
        const socket: WebSocketSocket = {
            id: "socket-1",
            send: vi.fn(),
            close: vi.fn(),
            terminate: vi.fn(),
        };

        const wsCtx: WebSocketContext = {
            socket,
            params: {},
            query: {},
            headers: {},
            cookies: {},
            state: new Map(),
        };

        const msgCtx: WebSocketMessageContext<string> = {
            message: "hello world",
            context: wsCtx,
        };

        expect(msgCtx.message).toBe("hello world");
        expect(msgCtx.context.socket.id).toBe("socket-1");
    });

    it("should satisfy the WebSocketMessageContext interface with a typed payload", () => {
        interface ChatMessage {
            event: string;
            data: string;
        }

        const socket: WebSocketSocket = {
            id: "socket-2",
            send: vi.fn(),
            close: vi.fn(),
            terminate: vi.fn(),
        };

        const wsCtx: WebSocketContext = {
            socket,
            params: {},
            query: {},
            headers: {},
            cookies: {},
            state: new Map(),
        };

        const msgCtx: WebSocketMessageContext<ChatMessage> = {
            message: { event: "chat", data: "Hi there!" },
            context: wsCtx,
        };

        expect(msgCtx.message.event).toBe("chat");
        expect(msgCtx.message.data).toBe("Hi there!");
    });
});
