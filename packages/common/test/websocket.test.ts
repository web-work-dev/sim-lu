import {
    describe,
    expect,
    it,
} from "vitest";

import {
    WebSocket,
    On,
    OnOpen,
    OnMessage,
    OnClose,
} from "../src/index.js";

import { METADATA_KEYS } from "../src/metadata/keys.js";

describe("WebSocket", () => {
    it("should define WebSocket metadata", () => {
        @WebSocket("/chat")
        class ChatGateway { }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.WEBSOCKET,
            ChatGateway,
        );

        expect(metadata).toEqual({
            path: "/chat",
        });
    });

    it("should define WebSocket metadata with subprotocol", () => {
        @WebSocket("/chat", "chat.v1")
        class ChatGateway { }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.WEBSOCKET,
            ChatGateway,
        );

        expect(metadata).toEqual({
            path: "/chat",
            subprotocol: "chat.v1",
        });
    });

    it("should define WebSocket event metadata", () => {
        @WebSocket("/chat")
        class ChatGateway {
            @OnOpen()
            open() { }

            @OnMessage()
            message() { }

            @OnClose()
            close() { }
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.WEBSOCKET_EVENTS,
            ChatGateway,
        );

        expect(metadata).toEqual([
            {
                event: "$open",
                handler: "open",
            },
            {
                event: "$message",
                handler: "message",
            },
            {
                event: "$close",
                handler: "close",
            },
        ]);
    });
    it("should define WebSocket lifecycle events", () => {
        @WebSocket("/chat")
        class ChatGateway {
            @OnOpen()
            open() { }

            @OnMessage()
            message() { }

            @OnClose()
            close() { }
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.WEBSOCKET_EVENTS,
            ChatGateway,
        );

        expect(metadata).toEqual([
            {
                event: "$open",
                handler: "open",
            },
            {
                event: "$message",
                handler: "message",
            },
            {
                event: "$close",
                handler: "close",
            },
        ]);
    });

    it("should define a custom websocket event", () => {
        @WebSocket("/chat")
        class ChatGateway {
            @On("typing")
            typing() { }
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.WEBSOCKET_EVENTS,
            ChatGateway,
        );

        expect(metadata).toEqual([
            {
                event: "typing",
                handler: "typing",
            },
        ]);
    });
});