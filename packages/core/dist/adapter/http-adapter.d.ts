import type { HttpRequest } from "@sim-lu/http";
import type { HttpRouteDefinition, WebSocketRouteDefinition } from "../router/route-definition.js";
import type { MutableHttpResponse } from "./http-response.js";
export interface ListenOptions {
    readonly port: number;
    readonly host?: string;
}
export type AdapterHttpHandler = (request: HttpRequest, response: MutableHttpResponse) => Promise<unknown>;
export type AdapterWebSocketHandler = (route: WebSocketRouteDefinition, state: Readonly<Record<string, unknown>>) => Promise<unknown>;
export interface HttpAdapter {
    readonly name: string;
    registerHttp(route: HttpRouteDefinition, handler: AdapterHttpHandler): void;
    registerWebSocket?(path: string, routes: readonly WebSocketRouteDefinition[], handler: AdapterWebSocketHandler): void;
    listen(options: ListenOptions): Promise<void>;
    close(): Promise<void>;
}
//# sourceMappingURL=http-adapter.d.ts.map