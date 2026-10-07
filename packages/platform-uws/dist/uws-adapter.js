import { MutableHttpResponse, NodeHttpKernel, parseCookies, parseQuery, serializeBody, } from "@sim-lu/core";
import { extractRequestId, extractTraceId, generateRequestId, generateTraceId, getStatusLine, handleAdapterError, notFoundBody, snapshotRequest, } from "@sim-lu/error";
function extractUwsHeader(request, name) {
    const value = request.getHeader(name.toLowerCase());
    return value && value.length > 0 ? value : undefined;
}
function extractUwsRequestId(request) {
    return extractUwsHeader(request, "x-request-id")
        ?? extractUwsHeader(request, "x-correlation-id");
}
function extractUwsTraceId(request) {
    return extractUwsHeader(request, "x-trace-id");
}
const METHOD_MAP = {
    GET: "get",
    POST: "post",
    PUT: "put",
    DELETE: "del",
    PATCH: "patch",
    OPTIONS: "options",
    HEAD: "head",
    CONNECT: "connect",
    TRACE: "trace",
};
export class UwsAdapter extends NodeHttpKernel {
    name = "uws";
    uwsApp;
    listenSocket;
    uwsModule;
    constructor(options = {}) {
        super("uws", options.error);
    }
    getInstance() {
        return this.uwsApp;
    }
    async listen(options) {
        const uws = await this.loadUws();
        if (!uws) {
            await super.listen(options);
            return;
        }
        this.uwsModule = uws;
        const app = uws.App();
        this.uwsApp = app;
        this.bindUwsRoutes(app);
        await new Promise((resolve, reject) => {
            app.listen(options.host ?? "127.0.0.1", options.port, (token) => {
                if (!token) {
                    reject(new Error("uWebSockets.js failed to bind the listen socket"));
                    return;
                }
                this.listenSocket = token;
                this.boundPort = options.port === 0 ? undefined : options.port;
                resolve();
            });
        });
    }
    async handle(incoming, outgoing) {
        const method = (incoming.method ?? "GET").toUpperCase();
        const url = incoming.url ?? "/";
        const pathname = url.split("?")[0] ?? "/";
        const matched = this.match(method, pathname);
        const requestId = extractRequestId(incoming.headers) ?? generateRequestId();
        const traceId = extractTraceId(incoming.headers) ?? generateTraceId();
        outgoing.setHeader("x-request-id", requestId);
        outgoing.setHeader("x-trace-id", traceId);
        const requestSnapshot = snapshotRequest({
            method,
            url: pathname,
            ...(typeof incoming.headers["user-agent"] === "string"
                ? { userAgent: incoming.headers["user-agent"] }
                : {}),
            requestId,
            traceId,
        });
        if (!matched) {
            this.writeSerializedNode(outgoing, notFoundBody(this.errorHandler, requestSnapshot));
            return;
        }
        try {
            const request = await this.toRequest(incoming, url, pathname, matched.params, requestId, traceId);
            const writer = new MutableHttpResponse();
            await matched.handler(request, writer);
            this.write(outgoing, writer);
        }
        catch (exception) {
            this.writeSerializedNode(outgoing, handleAdapterError(this.errorHandler, exception, requestSnapshot));
        }
    }
    async close() {
        if (this.listenSocket && this.uwsModule) {
            this.uwsModule.us_listen_socket_close(this.listenSocket);
            this.listenSocket = undefined;
            this.uwsApp = undefined;
            this.boundPort = undefined;
            return;
        }
        await super.close();
    }
    bindUwsRoutes(app) {
        for (const entry of this.httpRoutes) {
            const method = METHOD_MAP[entry.route.method];
            if (!method) {
                continue;
            }
            app[method](this.toUwsPath(entry.route.path), (response, request) => {
                void this.dispatchUws(entry.handler, request, response);
            });
        }
        app.any("/*", (response, request) => {
            const requestId = extractUwsRequestId(request) ?? generateRequestId();
            const traceId = extractUwsTraceId(request) ?? generateTraceId();
            response.writeHeader("x-request-id", requestId);
            response.writeHeader("x-trace-id", traceId);
            this.writeSerializedUws(response, notFoundBody(this.errorHandler, snapshotRequest({
                method: request.getMethod().toUpperCase(),
                url: request.getUrl() || "/",
                ...(request.getHeader("user-agent").length > 0
                    ? { userAgent: request.getHeader("user-agent") }
                    : {}),
                requestId,
                traceId,
            })));
        });
    }
    async dispatchUws(handler, request, response) {
        let aborted = false;
        response.onAborted(() => {
            aborted = true;
        });
        const requestId = extractUwsRequestId(request) ?? generateRequestId();
        const traceId = extractUwsTraceId(request) ?? generateTraceId();
        response.writeHeader("x-request-id", requestId);
        response.writeHeader("x-trace-id", traceId);
        const writer = new MutableHttpResponse();
        const requestSnapshot = snapshotRequest({
            method: request.getMethod().toUpperCase(),
            url: request.getUrl() || "/",
            ...(request.getHeader("user-agent").length > 0
                ? { userAgent: request.getHeader("user-agent") }
                : {}),
            requestId,
            traceId,
        });
        try {
            const httpRequest = await this.toHttpRequest(request, response, requestId, traceId);
            await handler(httpRequest, writer);
            if (!aborted) {
                this.writeUws(response, writer);
            }
        }
        catch (exception) {
            if (!aborted) {
                this.writeSerializedUws(response, handleAdapterError(this.errorHandler, exception, requestSnapshot));
            }
        }
    }
    async toHttpRequest(request, response, requestId, traceId) {
        const headers = {};
        request.forEach((key, value) => {
            headers[key] = value;
        });
        const url = request.getUrl() || "/";
        const queryString = request.getQuery();
        const remoteAddress = headers["x-forwarded-for"]?.toString() ?? "";
        const body = await this.readUwsBody(response, headers["content-type"]);
        return {
            method: request.getMethod().toUpperCase(),
            url,
            headers,
            query: parseQuery(queryString),
            params: request.getParams(),
            body,
            cookies: parseCookies(typeof headers.cookie === "string" ? headers.cookie : undefined),
            ip: remoteAddress,
            userAgent: typeof headers["user-agent"] === "string" ? headers["user-agent"] : "",
            requestId,
            traceId,
            connection: {
                remoteAddress,
                remotePort: 0,
            },
        };
    }
    async readUwsBody(response, contentType) {
        const raw = await new Promise((resolve, reject) => {
            const chunks = [];
            response.onData((chunk, isLast) => {
                chunks.push(Buffer.from(chunk));
                if (isLast) {
                    resolve(Buffer.concat(chunks).toString("utf8"));
                }
            });
            response.onAborted(() => {
                reject(new Error("Request aborted"));
            });
        });
        if (!raw) {
            return undefined;
        }
        const type = Array.isArray(contentType) ? contentType[0] : contentType;
        if (type?.includes("application/json")) {
            return JSON.parse(raw);
        }
        return raw;
    }
    writeUws(response, writer) {
        const serialized = serializeBody(writer.body);
        response.cork(() => {
            response.writeStatus(String(writer.status));
            for (const [name, value] of Object.entries(writer.headers)) {
                if (value !== undefined) {
                    const header = Array.isArray(value) ? value.join(", ") : value;
                    response.writeHeader(name, header);
                }
            }
            if (serialized.contentType) {
                response.writeHeader("content-type", serialized.contentType);
            }
            response.end(serialized.payload);
        });
    }
    writeSerializedUws(response, body) {
        response.cork(() => {
            response.writeStatus(getStatusLine(body.statusCode));
            for (const [name, value] of Object.entries(body.headers)) {
                const header = Array.isArray(value) ? value.join(", ") : value;
                response.writeHeader(name, header);
            }
            response.end(body.payload);
        });
    }
    toUwsPath(path) {
        return path;
    }
    async loadUws() {
        try {
            const loaded = await import("uWebSockets.js");
            if (typeof loaded.App === "function" && typeof loaded.us_listen_socket_close === "function") {
                return {
                    App: loaded.App,
                    us_listen_socket_close: loaded.us_listen_socket_close,
                };
            }
            if (loaded.default && typeof loaded.default.App === "function") {
                return loaded.default;
            }
            return undefined;
        }
        catch {
            return undefined;
        }
    }
}
//# sourceMappingURL=uws-adapter.js.map