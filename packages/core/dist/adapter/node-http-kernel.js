import { createServer } from "node:http";
import { createPlatformErrorHandler, extractRequestId, extractTraceId, generateRequestId, generateTraceId, handleAdapterError, notFoundBody, snapshotRequest, } from "@sim-lu/error";
import { MutableHttpResponse } from "./http-response.js";
import { extractParamNames, parseCookies, parseQuery, serializeBody } from "./http-utils.js";
import { matchPath, pathSpecificity } from "../router/path.js";
export class NodeHttpKernel {
    httpRoutes = [];
    websocketRoutes = new Map();
    websocketHandlers = new Map();
    server;
    boundPort;
    errorHandler;
    constructor(platform = "node", options = {}) {
        this.errorHandler = createPlatformErrorHandler(platform, {
            console: false,
            ...options,
        });
    }
    registerHttp(route, handler) {
        this.httpRoutes.push({
            route,
            handler,
            paramNames: extractParamNames(route.path),
        });
    }
    registerWebSocket(path, routes, handler) {
        this.websocketRoutes.set(path, routes);
        this.websocketHandlers.set(path, handler);
    }
    async listen(options) {
        const host = options.host ?? "127.0.0.1";
        await new Promise((resolve, reject) => {
            this.server = createServer((request, response) => {
                void this.handle(request, response);
            });
            this.server.once("error", reject);
            this.server.listen(options.port, host, () => {
                const address = this.server?.address();
                if (typeof address === "object" && address) {
                    this.boundPort = address.port;
                }
                else {
                    this.boundPort = options.port;
                }
                this.server?.off("error", reject);
                resolve();
            });
        });
    }
    async close() {
        const server = this.server;
        if (!server) {
            return;
        }
        await new Promise((resolve, reject) => {
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
    getPort() {
        return this.boundPort;
    }
    getErrorHandler() {
        return this.errorHandler;
    }
    getRegisteredHttpRoutes() {
        return this.httpRoutes.map((entry) => entry.route);
    }
    getRegisteredWebSocketPaths() {
        return [...this.websocketRoutes.keys()];
    }
    async dispatchWebSocket(path, event, state = {}) {
        const handler = this.websocketHandlers.get(path);
        const route = this.websocketRoutes.get(path)?.find((item) => item.event === event);
        if (!handler || !route) {
            throw new Error(`WebSocket route not found: ${path} ${event}`);
        }
        return handler(route, state);
    }
    async handleRequest(request, response) {
        await this.handle(request, response);
    }
    async handle(incoming, outgoing) {
        const method = (incoming.method ?? "GET").toUpperCase();
        const url = incoming.url ?? "/";
        const pathname = url.split("?")[0] ?? "/";
        const matched = this.match(method, pathname);
        const headers = incoming.headers;
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
            this.writeSerializedNode(outgoing, notFoundBody(this.errorHandler, requestSnapshot));
            return;
        }
        const request = await this.toRequest(incoming, url, pathname, matched.params, requestId, traceId);
        const writer = new MutableHttpResponse();
        try {
            await matched.handler(request, writer);
            this.write(outgoing, writer);
        }
        catch (exception) {
            this.writeSerializedNode(outgoing, handleAdapterError(this.errorHandler, exception, requestSnapshot));
        }
    }
    match(method, pathname) {
        let best;
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
    async toRequest(incoming, url, pathname, params, requestId, traceId) {
        const headers = {};
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
            cookies: parseCookies(typeof headers.cookie === "string" ? headers.cookie : undefined),
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
    async readBody(incoming, contentType) {
        const chunks = [];
        for await (const chunk of incoming) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        if (chunks.length === 0) {
            return undefined;
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        const type = Array.isArray(contentType) ? contentType[0] : contentType;
        if (type?.includes("application/json")) {
            return JSON.parse(raw);
        }
        return raw;
    }
    write(outgoing, writer) {
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
    writeSerializedNode(outgoing, body) {
        outgoing.statusCode = body.statusCode;
        for (const [name, value] of Object.entries(body.headers)) {
            outgoing.setHeader(name, value);
        }
        outgoing.end(body.payload);
    }
}
//# sourceMappingURL=node-http-kernel.js.map