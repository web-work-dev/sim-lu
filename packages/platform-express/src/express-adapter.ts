import type { IncomingMessage, Server, ServerResponse } from "node:http";

import {
    MutableHttpResponse,
    NodeHttpKernel,
    parseCookies,
    serializeBody,
    type ListenOptions,
} from "@sim-lu/core";
import {
    extractRequestId,
    extractTraceId,
    generateRequestId,
    generateTraceId,
    handleAdapterError,
    notFoundBody,
    snapshotRequest,
    type ErrorHandlerOptions,
} from "@sim-lu/error";
import type { HttpRequest } from "@sim-lu/http";
import express, {
    type Express,
    type NextFunction,
    type Request,
    type Response,
} from "express";

type ExpressMethod =
    | "get"
    | "post"
    | "put"
    | "delete"
    | "patch"
    | "head"
    | "options";

const METHOD_MAP: Readonly<Record<string, ExpressMethod>> = {
    GET: "get",
    POST: "post",
    PUT: "put",
    DELETE: "delete",
    PATCH: "patch",
    HEAD: "head",
    OPTIONS: "options",
};

export interface ExpressAdapterOptions {
    readonly error?: ErrorHandlerOptions;
}

export class ExpressAdapter extends NodeHttpKernel {
    public readonly name = "express";

    private expressApp: Express | undefined;
    private routesBound = false;

    public constructor(
        options: ExpressAdapterOptions = {},
    ) {
        super("express", options.error);
    }

    public getInstance(): Express {
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

    public override async listen(
        options: ListenOptions,
    ): Promise<void> {
        const app = this.getInstance();
        this.bindExpressRoutes(app);

        await new Promise<void>((resolve, reject) => {
            const server: Server = app.listen(
                options.port,
                options.host ?? "127.0.0.1",
                () => {
                    const address = server.address();

                    if (typeof address === "object" && address) {
                        this.boundPort = address.port;
                    } else {
                        this.boundPort = options.port;
                    }

                    server.off("error", reject);
                    resolve();
                },
            );

            this.server = server;
            server.once("error", reject);
        });
    }

    public override async handleRequest(
        request: IncomingMessage,
        response: ServerResponse,
    ): Promise<void> {
        const app = this.getInstance();
        this.bindExpressRoutes(app);
        app(request, response);
    }

    private bindExpressRoutes(
        app: Express,
    ): void {
        if (this.routesBound) {
            return;
        }

        this.routesBound = true;

        for (const entry of this.httpRoutes) {
            const method = METHOD_MAP[entry.route.method];

            if (!method) {
                continue;
            }

            app[method](
                this.toExpressPath(entry.route.path),
                async (request: Request, response: Response, next: NextFunction) => {
                    const requestId = extractRequestId(request.headers) ?? generateRequestId();
                    const traceId = extractTraceId(request.headers) ?? generateTraceId();

                    response.setHeader("x-request-id", requestId);
                    response.setHeader("x-trace-id", traceId);

                    const writer = new MutableHttpResponse();

                    try {
                        await entry.handler(
                            this.toHttpRequest(request, requestId, traceId),
                            writer,
                        );
                        this.writeExpress(response, writer);
                    } catch (exception) {
                        next(exception);
                    }
                },
            );
        }

        app.use((request, response) => {
            const requestId = extractRequestId(request.headers) ?? generateRequestId();
            const traceId = extractTraceId(request.headers) ?? generateTraceId();

            response.setHeader("x-request-id", requestId);
            response.setHeader("x-trace-id", traceId);

            this.writeSerialized(
                response,
                notFoundBody(this.errorHandler, snapshotRequest({
                    method: request.method,
                    url: request.path,
                    ...(request.ip ? { ip: request.ip } : {}),
                    ...(typeof request.headers["user-agent"] === "string"
                        ? { userAgent: request.headers["user-agent"] }
                        : {}),
                    requestId,
                    traceId,
                })),
            );
        });

        app.use((
            exception: unknown,
            request: Request,
            response: Response,
            _next: NextFunction,
        ) => {
            const requestId = extractRequestId(request.headers) ?? generateRequestId();
            const traceId = extractTraceId(request.headers) ?? generateTraceId();

            response.setHeader("x-request-id", requestId);
            response.setHeader("x-trace-id", traceId);

            this.writeSerialized(
                response,
                handleAdapterError(
                    this.errorHandler,
                    exception,
                    snapshotRequest({
                        method: request.method,
                        url: request.path,
                        ...(request.ip ? { ip: request.ip } : {}),
                        ...(typeof request.headers["user-agent"] === "string"
                            ? { userAgent: request.headers["user-agent"] }
                            : {}),
                        requestId,
                        traceId,
                    }),
                ),
            );
        });
    }

    private toExpressPath(
        path: string,
    ): string {
        return path;
    }

    private toHttpRequest(
        request: Request,
        requestId: string,
        traceId: string,
    ): HttpRequest {
        const headers: Record<string, string | string[] | undefined> = {};

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
            cookies: parseCookies(
                typeof request.headers.cookie === "string"
                    ? request.headers.cookie
                    : undefined,
            ),
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

    private normalizeDict(
        value: object,
    ): Record<string, string | string[] | undefined> {
        const result: Record<string, string | string[] | undefined> = {};

        for (const [key, entry] of Object.entries(value)) {
            if (typeof entry === "string") {
                result[key] = entry;
            } else if (Array.isArray(entry) && entry.every((item) => typeof item === "string")) {
                result[key] = entry;
            } else if (entry === undefined) {
                result[key] = undefined;
            } else {
                result[key] = String(entry);
            }
        }

        return result;
    }

    private writeExpress(
        response: Response,
        writer: MutableHttpResponse,
    ): void {
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

    private writeSerialized(
        response: Response,
        body: {
            readonly payload: string;
            readonly statusCode: number;
            readonly headers: Readonly<Record<string, string | string[]>>;
        },
    ): void {
        response.status(body.statusCode);

        for (const [name, value] of Object.entries(body.headers)) {
            response.setHeader(name, value);
        }

        response.send(body.payload);
    }
}
