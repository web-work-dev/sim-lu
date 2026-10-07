import type { WebSocketSocket } from "./socket.js";
export interface WebSocketContext {
    readonly socket: WebSocketSocket;
    readonly params: Readonly<Record<string, string | string[] | undefined>>;
    readonly query: Readonly<Record<string, string | string[] | undefined>>;
    readonly headers: Readonly<Record<string, string | string[] | undefined>>;
    readonly cookies: Readonly<Record<string, string | undefined>>;
    readonly state: Map<string, unknown>;
}
//# sourceMappingURL=context.d.ts.map