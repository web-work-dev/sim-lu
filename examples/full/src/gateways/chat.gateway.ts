import {
    OnClose,
    OnMessage,
    OnOpen,
    WebSocket,
    WsContext,
    WsMessage,
    WsSocket,
} from "@sim-lu/core";
import type {
    WebSocketContext,
    WebSocketMessageContext,
    WebSocketSocket,
} from "@sim-lu/http";

@WebSocket("/ws/chat")
export class ChatGateway {
    private readonly clients = new Set<string>();

    @OnOpen()
    public onOpen(
        @WsSocket() socket: WebSocketSocket,
        @WsContext() _context: WebSocketContext,
    ): void {
        this.clients.add(socket.id);
        socket.send(JSON.stringify({
            type: "welcome",
            message: "Welcome to the chat!",
            clientId: socket.id,
        }));
    }

    @OnMessage()
    public onMessage(
        @WsSocket() socket: WebSocketSocket,
        @WsMessage() message: WebSocketMessageContext,
    ): void {
        const payload = message.message;
        const text = typeof payload === "string"
            ? payload
            : JSON.stringify(payload);

        const broadcast = JSON.stringify({
            type: "broadcast",
            from: socket.id,
            message: text,
        });

        for (const clientId of this.clients) {
            void clientId;
            socket.send(broadcast);
        }
    }

    @OnClose()
    public onClose(
        @WsSocket() socket: WebSocketSocket,
    ): void {
        this.clients.delete(socket.id);
    }
}
