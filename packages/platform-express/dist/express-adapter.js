import { MutableHttpResponse, NodeHttpKernel, parseCookies, serializeBody, } from "@sim-lu/core";
import { extractRequestId, extractTraceId, generateRequestId, generateTraceId, handleAdapterError, notFoundBody, snapshotRequest, } from "@sim-lu/error";
import express, {} from "express";
const METHOD_MAP = {
    GET: "get",
    POST: "post",
    PUT: "put",
    DELETE: "delete",
    PATCH: "patch",
    HEAD: "head",
    OPTIONS: "options",
};
export class ExpressAdapter extends NodeHttpKernel {
    name = "express";
    expressApp;
    routesBound = false;
    constructor(options = {}) {
        super("express", options.error);
    }
    getInstance() {
        if (!this.expressApp) {
            const app = express();
            app.disable("x-powered-by");
            app.use(express.json({ strict: false }));
            app.use(express.urlencoded({ extended: true }));
            app.use(express.text({ type: "text/*" }));
            this.expressApp = app;
        }
        return this.expressApp;
    }
    async listen(options) {
        const app = this.getInstance();
        this.bindExpressRoutes(app);
        await new Promise((resolve, reject) => {
            const server = app.listen(options.port, options.host ?? "127.0.0.1", () => {
                const address = server.address();
                if (typeof address === "object" && address) {
                    this.boundPort = address.port;
                }
                else {
                    this.boundPort = options.port;
                }
                server.off("error", reject);
                resolve();
            });
            this.server = server;
            server.once("error", reject);
        });
    }
    async handleRequest(request, response) {
        const app = this.getInstance();
        this.bindExpressRoutes(app);
        app(request, response);
    }
    bindExpressRoutes(app) {
        if (this.routesBound) {
            return;
        }
        this.routesBound = true;
        for (const entry of this.httpRoutes) {
            const method = METHOD_MAP[entry.route.method];
            if (!method) {
                continue;
            }
            app[method](this.toExpressPath(entry.route.path), async (request, response, next) => {
                const requestId = extractRequestId(request.headers) ?? generateRequestId();
                const traceId = extractTraceId(request.headers) ?? generateTraceId();
                response.setHeader("x-request-id", requestId);
                response.setHeader("x-trace-id", traceId);
                const writer = new MutableHttpResponse();
                try {
                    await entry.handler(this.toHttpRequest(request, requestId, traceId), writer);
                    this.writeExpress(response, writer);
                }
                catch (exception) {
                    next(exception);
                }
            });
        }
        app.use((request, response) => {
            const requestId = extractRequestId(request.headers) ?? generateRequestId();
            const traceId = extractTraceId(request.headers) ?? generateTraceId();
            response.setHeader("x-request-id", requestId);
            response.setHeader("x-trace-id", traceId);
            this.writeSerialized(response, notFoundBody(this.errorHandler, snapshotRequest({
                method: request.method,
                url: request.path,
                ...(request.ip ? { ip: request.ip } : {}),
                ...(typeof request.headers["user-agent"] === "string"
                    ? { userAgent: request.headers["user-agent"] }
                    : {}),
                requestId,
                traceId,
            })));
        });
        app.use((exception, request, response, _next) => {
            const requestId = extractRequestId(request.headers) ?? generateRequestId();
            const traceId = extractTraceId(request.headers) ?? generateTraceId();
            response.setHeader("x-request-id", requestId);
            response.setHeader("x-trace-id", traceId);
            this.writeSerialized(response, handleAdapterError(this.errorHandler, exception, snapshotRequest({
                method: request.method,
                url: request.path,
                ...(request.ip ? { ip: request.ip } : {}),
                ...(typeof request.headers["user-agent"] === "string"
                    ? { userAgent: request.headers["user-agent"] }
                    : {}),
                requestId,
                traceId,
            })));
        });
    }
    toExpressPath(path) {
        return path;
    }
    toHttpRequest(request, requestId, traceId) {
        const headers = {};
        for (const [key, value] of Object.entries(request.headers)) {
            headers[key] = value;
        }
        const remoteAddress = request.ip
            ?? request.socket.remoteAddress
            ?? "";
        return {
            method: request.method.toUpperCase(),
            url: request.path,
            headers,
            query: this.normalizeDict(request.query),
            params: this.normalizeDict(request.params),
            body: request.body,
            cookies: parseCookies(typeof request.headers.cookie === "string"
                ? request.headers.cookie
                : undefined),
            ip: remoteAddress,
            userAgent: typeof request.headers["user-agent"] === "string"
                ? request.headers["user-agent"]
                : "",
            requestId,
            traceId,
            connection: {
                remoteAddress,
                remotePort: request.socket.remotePort ?? 0,
            },
        };
    }
    normalizeDict(value) {
        const result = {};
        for (const [key, entry] of Object.entries(value)) {
            if (typeof entry === "string") {
                result[key] = entry;
            }
            else if (Array.isArray(entry) && entry.every((item) => typeof item === "string")) {
                result[key] = entry;
            }
            else if (entry === undefined) {
                result[key] = undefined;
            }
            else {
                result[key] = String(entry);
            }
        }
        return result;
    }
    writeExpress(response, writer) {
        const serialized = serializeBody(writer.body);
        response.status(writer.status);
        for (const [name, value] of Object.entries(writer.headers)) {
            if (value !== undefined) {
                response.setHeader(name, value);
            }
        }
        if (serialized.contentType && !response.getHeader("content-type")) {
            response.setHeader("content-type", serialized.contentType);
        }
        response.send(serialized.payload);
    }
    writeSerialized(response, body) {
        response.status(body.statusCode);
        for (const [name, value] of Object.entries(body.headers)) {
            response.setHeader(name, value);
        }
        response.send(body.payload);
    }
}
//# sourceMappingURL=express-adapter.js.map