import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { HttpRequest } from "@sim-lu/http";
import { type ErrorHandler, type ErrorHandlerOptions, type SerializedBody } from "@sim-lu/error";
import type { AdapterHttpHandler, AdapterWebSocketHandler, HttpAdapter, ListenOptions } from "./http-adapter.js";
import { MutableHttpResponse } from "./http-response.js";
import type { HttpRouteDefinition, WebSocketRouteDefinition } from "../router/route-definition.js";
interface RegisteredHttpRoute {
    readonly route: HttpRouteDefinition;
    readonly handler: AdapterHttpHandler;
    readonly paramNames: readonly string[];
}
export declare abstract class NodeHttpKernel implements HttpAdapter {
    abstract readonly name: string;
    protected readonly httpRoutes: RegisteredHttpRoute[];
    protected readonly websocketRoutes: Map<string, readonly WebSocketRouteDefinition<object>[]>;
    protected readonly websocketHandlers: Map<string, AdapterWebSocketHandler>;
    protected server: Server | undefined;
    protected boundPort: number | undefined;
    protected errorHandler: ErrorHandler;
    constructor(platform?: string, options?: ErrorHandlerOptions);
    registerHttp(route: HttpRouteDefinition, handler: AdapterHttpHandler): void;
    registerWebSocket(path: string, routes: readonly WebSocketRouteDefinition[], handler: AdapterWebSocketHandler): void;
    listen(options: ListenOptions): Promise<void>;
    close(): Promise<void>;
    getPort(): number | undefined;
    getErrorHandler(): ErrorHandler;
    getRegisteredHttpRoutes(): readonly HttpRouteDefinition[];
    getRegisteredWebSocketPaths(): readonly string[];
    dispatchWebSocket(path: string, event: string, state?: Readonly<Record<string, unknown>>): Promise<unknown>;
    handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void>;
    protected handle(incoming: IncomingMessage, outgoing: ServerResponse): Promise<void>;
    protected match(method: string, pathname: string): {
        readonly handler: AdapterHttpHandler;
        readonly params: Record<string, string | string[] | undefined>;
    } | undefined;
    protected toRequest(incoming: IncomingMessage, url: string, pathname: string, params: Record<string, string | string[] | undefined>, requestId: string, traceId: string): Promise<HttpRequest>;
    protected readBody(incoming: IncomingMessage, contentType: string | string[] | undefined): Promise<unknown>;
    protected write(outgoing: ServerResponse, writer: MutableHttpResponse): void;
    protected writeSerializedNode(outgoing: ServerResponse, body: SerializedBody): void;
}
export {};
//# sourceMappingURL=node-http-kernel.d.ts.map