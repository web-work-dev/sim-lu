import type { WebSocketContext } from "./context.js";

export interface WebSocketMessageContext<T = unknown> {
    readonly message: T;

    readonly context: WebSocketContext;
}