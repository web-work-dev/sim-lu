import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";

import type { HttpRequest } from "@sim-lu/http";
import {
    createPlatformErrorHandler,
    extractRequestId,
    extractTraceId,
    generateRequestId,
    generateTraceId,
    handleAdapterError,
    notFoundBody,
    snapshotRequest,
    type ErrorHandler,
    type ErrorHandlerOptions,
    type SerializedBody,
} from "@sim-lu/error";

import type {
    AdapterHttpHandler,
    AdapterWebSocketHandler,
    HttpAdapter,
    ListenOptions,
} from "./http-adapter.js";
import { MutableHttpResponse } from "./http-response.js";
import { extractParamNames, parseCookies, parseQuery, serializeBody } from "./http-utils.js";
import { matchPath, pathSpecificity } from "../router/path.js";
import type { HttpRouteDefinition, WebSocketRouteDefinition } from "../router/route-definition.js";

interface RegisteredHttpRoute {
    readonly route: HttpRouteDefinition;
    readonly handler: AdapterHttpHandler;
    readonly paramNames: readonly string[];
}

export abstract class NodeHttpKernel implements HttpAdapter {
    public abstract readonly name: string;

    protected readonly httpRoutes: RegisteredHttpRoute[] = [];
    protected readonly websocketRoutes = new Map<string, readonly WebSocketRouteDefinition[]>();
    protected readonly websocketHandlers = new Map<string, AdapterWebSocketHandler>();
    protected server: Server | undefined;
    protected boundPort: number | undefined;
    protected errorHandler: ErrorHandler;

    public constructor(platform = "node", options: ErrorHandlerOptions = {}) {
        this.errorHandler = createPlatformErrorHandler(platform, {
            console: false,
            ...options,
        });
    }

    public registerHttp(
        route: HttpRouteDefinition,
        handler: AdapterHttpHandler,
    ): void {
        this.httpRoutes.push({
            route,
            handler,
            paramNames: extractParamNames(route.path),
        });
    }

    public registerWebSocket(
        path: string,
        routes: readonly WebSocketRouteDefinition[],
        handler: AdapterWebSocketHandler,
    ): void {
        this.websocketRoutes.set(path, routes);
        this.websocketHandlers.set(path, handler);
    }

    public async listen(
        options: ListenOptions,
    ): Promise<void> {
        const host = options.host ?? "127.0.0.1";

        await new Promise<void>((resolve, reject) => {
            this.server = createServer((request, response) => {
                void this.handle(request, response);
            });

            this.server.once("error", reject);
            this.server.listen(options.port, host, () => {
                const address = this.server?.address();

                if (typeof address === "object" && address) {
                    this.boundPort = address.port;
                } else {
                    this.boundPort = options.port;
                }

                this.server?.off("error", reject);
                resolve();
            });
        });
    }

    public async close(): Promise<void> {
        const server = this.server;

        if (!server) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        this.server = undefined;
        this.boundPort = undefined;
    }

    public getPort(): number | undefined {
        return this.boundPort;
    }

    public getErrorHandler(): ErrorHandler {
        return this.errorHandler;
    }

    public getRegisteredHttpRoutes(): readonly HttpRouteDefinition[] {
        return this.httpRoutes.map((entry) => entry.route);
    }

    public getRegisteredWebSocketPaths(): readonly string[] {
        return [...this.websocketRoutes.keys()];
    }

    public async dispatchWebSocket(
        path: string,
        event: string,
        state: Readonly<Record<string, unknown>> = {},
    ): Promise<unknown> {
        const handler = this.websocketHandlers.get(path);
        const route = this.websocketRoutes.get(path)?.find((item) => item.event === event);

        if (!handler || !route) {
            throw new Error(`WebSocket route not found: ${path} ${event}`);
        }

        return handler(route, state);
    }

    public async handleRequest(
        request: IncomingMessage,
        response: ServerResponse,
    ): Promise<void> {
        await this.handle(request, response);
    }

    protected async handle(
        incoming: IncomingMessage,
        outgoing: ServerResponse,
    ): Promise<void> {
        const method = (incoming.method ?? "GET").toUpperCase();
        const url = incoming.url ?? "/";
        const pathname = url.split("?")[0] ?? "/";
        const matched = this.match(method, pathname);

        const headers = incoming.headers as Record<string, string | string[] | undefined>;
        const requestId = extractRequestId(headers) ?? generateRequestId();
        const traceId = extractTraceId(headers) ?? generateTraceId();

        outgoing.setHeader("x-request-id", requestId);
        outgoing.setHeader("x-trace-id", traceId);

        const requestSnapshot = snapshotRequest({
            method,
            url: pathname,
            ...(typeof headers["user-agent"] === "string"
                ? { userAgent: headers["user-agent"] }
                : {}),
            requestId,
            traceId,
        });

        if (!matched) {
            this.writeSerializedNode(
                outgoing,
                notFoundBody(this.errorHandler, requestSnapshot),
            );
            return;
        }

        const request = await this.toRequest(incoming, url, pathname, matched.params, requestId, traceId);
        const writer = new MutableHttpResponse();

        try {
            await matched.handler(request, writer);
            this.write(outgoing, writer);
        } catch (exception) {
            this.writeSerializedNode(
                outgoing,
                handleAdapterError(this.errorHandler, exception, requestSnapshot),
            );
        }
    }

    protected match(
        method: string,
        pathname: string,
    ): {
        readonly handler: AdapterHttpHandler;
        readonly params: Record<string, string | string[] | undefined>;
    } | undefined {
        let best:
            | {
                readonly handler: AdapterHttpHandler;
                readonly params: Record<string, string | string[] | undefined>;
                readonly score: number;
            }
            | undefined;

        for (const entry of this.httpRoutes) {
            if (entry.route.method !== method) {
                continue;
            }

            if (entry.route.path === pathname) {
                return {
                    handler: entry.handler,
                    params: {},
                };
            }

            const params = matchPath(entry.route.path, pathname);

            if (!params) {
                continue;
            }

            const score = pathSpecificity(entry.route.path);

            if (!best || score > best.score) {
                best = {
                    handler: entry.handler,
                    params,
                    score,
                };
            }
        }

        if (!best) {
            return undefined;
        }

        return {
            handler: best.handler,
            params: best.params,
        };
    }

    protected async toRequest(
        incoming: IncomingMessage,
        url: string,
        pathname: string,
        params: Record<string, string | string[] | undefined>,
        requestId: string,
        traceId: string,
    ): Promise<HttpRequest> {
        const headers: Record<string, string | string[] | undefined> = {};

        for (const [key, value] of Object.entries(incoming.headers)) {
            headers[key] = value;
        }

        const search = url.includes("?") ? url.slice(url.indexOf("?")) : "";
        const remoteAddress = incoming.socket.remoteAddress ?? "";
        const body = await this.readBody(incoming, headers["content-type"]);

        return {
            method: (incoming.method ?? "GET").toUpperCase(),
            url: pathname,
            headers,
            query: parseQuery(search),
            params,
            body,
            cookies: parseCookies(
                typeof headers.cookie === "string" ? headers.cookie : undefined,
            ),
            ip: remoteAddress,
            userAgent: typeof headers["user-agent"] === "string" ? headers["user-agent"] : "",
            requestId,
            traceId,
            connection: {
                remoteAddress,
                remotePort: incoming.socket.remotePort ?? 0,
            },
        };
    }

    protected async readBody(
        incoming: IncomingMessage,
        contentType: string | string[] | undefined,
    ): Promise<unknown> {
        const chunks: Buffer[] = [];

        for await (const chunk of incoming) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        if (chunks.length === 0) {
            return undefined;
        }

        const raw = Buffer.concat(chunks).toString("utf8");
        const type = Array.isArray(contentType) ? contentType[0] : contentType;

        if (type?.includes("application/json")) {
            return JSON.parse(raw) as unknown;
        }

        return raw;
    }

    protected write(
        outgoing: ServerResponse,
        writer: MutableHttpResponse,
    ): void {
        const serialized = serializeBody(writer.body);

        outgoing.statusCode = writer.status;

        for (const [name, value] of Object.entries(writer.headers)) {
            if (value !== undefined) {
                outgoing.setHeader(name, value);
            }
        }

        if (serialized.contentType && !outgoing.getHeader("content-type")) {
            outgoing.setHeader("content-type", serialized.contentType);
        }

        outgoing.end(serialized.payload);
    }

    protected writeSerializedNode(
        outgoing: ServerResponse,
        body: SerializedBody,
    ): void {
        outgoing.statusCode = body.statusCode;

        for (const [name, value] of Object.entries(body.headers)) {
            outgoing.setHeader(name, value);
        }

        outgoing.end(body.payload);
    }
}
