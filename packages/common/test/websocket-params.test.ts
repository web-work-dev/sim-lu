import {
    describe,
    expect,
    it,
} from "vitest";

import {
    WebSocket,
    OnMessage,
    OnOpen,
    WsMessage,
    WsSocket,
    WsContext,
} from "../src/index.js";

import { METADATA_KEYS } from "../src/metadata/keys.js";

describe("WebSocket parameter decorators", () => {
    it("should define WebSocket message parameter metadata", () => {
        @WebSocket("/chat")
        class ChatGateway {
            @OnMessage()
            message(
                @WsMessage()
                message: unknown,
            ) { }
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.PARAM,
            ChatGateway,
        );

        expect(metadata).toEqual([
            {
                type: "ws-message",
                index: 0,
                handler: "message",
            },
        ]);
    });

    it("should define multiple WebSocket parameters", () => {
        @WebSocket("/chat")
        class ChatGateway {
            @OnMessage()
            message(
                @WsMessage()
                message: unknown,

                @WsSocket()
                socket: unknown,

                @WsContext()
                context: unknown,
            ) { }
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.PARAM,
            ChatGateway,
        );

        expect(metadata).toEqual([
            {
                type: "ws-message",
                index: 0,
                handler: "message",
            },
            {
                type: "ws-socket",
                index: 1,
                handler: "message",
            },
            {
                type: "ws-context",
                index: 2,
                handler: "message",
            },
        ]);
    });

    it("should keep parameters associated with their handlers", () => {
        @WebSocket("/chat")
        class ChatGateway {
            @OnMessage()
            message(
                @WsMessage()
                message: unknown,
            ) { }

            @OnOpen()
            open(
                @WsSocket()
                socket: unknown,
            ) { }
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.PARAM,
            ChatGateway,
        );

        expect(metadata).toEqual([
            {
                type: "ws-message",
                index: 0,
                handler: "message",
            },
            {
                type: "ws-socket",
                index: 0,
                handler: "open",
            },
        ]);
    });
});