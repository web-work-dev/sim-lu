import type { IncomingMessage, ServerResponse } from "node:http";

import {
    MutableHttpResponse,
    NodeHttpKernel,
    parseCookies,
    parseQuery,
    serializeBody,
    type ListenOptions,
} from "@sim-lu/core";
import {
    extractRequestId,
    extractTraceId,
    generateRequestId,
    generateTraceId,
    getStatusLine,
    handleAdapterError,
    notFoundBody,
    snapshotRequest,
    type ErrorHandlerOptions,
    type SerializedBody,
} from "@sim-lu/error";
import type { HttpRequest } from "@sim-lu/http";

type UwsHttpRequest = {
    getMethod(): string;
    getUrl(): string;
    getQuery(): string;
    getHeader(name: string): string;
    forEach(callback: (key: string, value: string) => void): void;
    getParams(): Record<string, string>;
};

function extractUwsHeader(
    request: UwsHttpRequest,
    name: string,
): string | undefined {
    const value = request.getHeader(name.toLowerCase());
    return value && value.length > 0 ? value : undefined;
}

function extractUwsRequestId(
    request: UwsHttpRequest,
): string | undefined {
    return extractUwsHeader(request, "x-request-id")
        ?? extractUwsHeader(request, "x-correlation-id");
}

function extractUwsTraceId(
    request: UwsHttpRequest,
): string | undefined {
    return extractUwsHeader(request, "x-trace-id");
}

type UwsHttpResponse = {
    onData(handler: (chunk: ArrayBuffer, isLast: boolean) => void): UwsHttpResponse;
    onAborted(handler: () => void): UwsHttpResponse;
    cork(handler: () => void): void;
    writeStatus(status: string): UwsHttpResponse;
    writeHeader(key: string, value: string): UwsHttpResponse;
    end(body?: string | ArrayBuffer): UwsHttpResponse;
};

type UwsListenSocket = object;

type UwsTemplatedApp = {
    get(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    post(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    put(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    del(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    patch(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    options(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    head(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    connect(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    trace(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    any(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    listen(
        host: string,
        port: number,
        callback: (listenSocket: UwsListenSocket | false) => void,
    ): UwsTemplatedApp;
};

type UwsModule = {
    App(): UwsTemplatedApp;
    us_listen_socket_close(socket: UwsListenSocket): void;
};

type UwsMethod =
    | "get"
    | "post"
    | "put"
    | "del"
    | "patch"
    | "options"
    | "head"
    | "connect"
    | "trace";

const METHOD_MAP: Readonly<Record<string, UwsMethod>> = {
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

export interface UwsAdapterOptions {
    readonly error?: ErrorHandlerOptions;
}

export class UwsAdapter extends NodeHttpKernel {
    public readonly name = "uws";

    private uwsApp: UwsTemplatedApp | undefined;
    private listenSocket: UwsListenSocket | undefined;
    private uwsModule: UwsModule | undefined;

    public constructor(
        options: UwsAdapterOptions = {},
    ) {
        super("uws", options.error);
    }

    public getInstance(): UwsTemplatedApp | undefined {
        return this.uwsApp;
    }

    public override async listen(
        options: ListenOptions,
    ): Promise<void> {
        const uws = await this.loadUws();

        if (!uws) {
            await super.listen(options);
            return;
        }

        this.uwsModule = uws;
        const app = uws.App();
        this.uwsApp = app;
        this.bindUwsRoutes(app);

        await new Promise<void>((resolve, reject) => {
            app.listen(
                options.host ?? "127.0.0.1",
                options.port,
                (token) => {
                    if (!token) {
                        reject(new Error("uWebSockets.js failed to bind the listen socket"));
                        return;
                    }

                    this.listenSocket = token;
                    this.boundPort = options.port === 0 ? undefined : options.port;
                    resolve();
                },
            );
        });
    }

    protected override async handle(
        incoming: IncomingMessage,
        outgoing: ServerResponse,
    ): Promise<void> {
        const method = (incoming.method ?? "GET").toUpperCase();
        const url = incoming.url ?? "/";
        const pathname = url.split("?")[0] ?? "/";
        const matched = this.match(method, pathname);
        const requestId = extractRequestId(incoming.headers as Record<string, string | string[] | undefined>) ?? generateRequestId();
        const traceId = extractTraceId(incoming.headers as Record<string, string | string[] | undefined>) ?? generateTraceId();

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
            this.writeSerializedNode(
                outgoing,
                notFoundBody(this.errorHandler, requestSnapshot),
            );
            return;
        }

        try {
            const request = await this.toRequest(incoming, url, pathname, matched.params, requestId, traceId);
            const writer = new MutableHttpResponse();
            await matched.handler(request, writer);
            this.write(outgoing, writer);
        } catch (exception) {
            this.writeSerializedNode(
                outgoing,
                handleAdapterError(this.errorHandler, exception, requestSnapshot),
            );
        }
    }

    public override async close(): Promise<void> {
        if (this.listenSocket && this.uwsModule) {
            this.uwsModule.us_listen_socket_close(this.listenSocket);
            this.listenSocket = undefined;
            this.uwsApp = undefined;
            this.boundPort = undefined;
            return;
        }

        await super.close();
    }

    private bindUwsRoutes(
        app: UwsTemplatedApp,
    ): void {
        for (const entry of this.httpRoutes) {
            const method = METHOD_MAP[entry.route.method];

            if (!method) {
                continue;
            }

            app[method](
                this.toUwsPath(entry.route.path),
                (response, request) => {
                    void this.dispatchUws(
                        entry.handler,
                        request,
                        response,
                    );
                },
            );
        }

        app.any("/*", (response, request) => {
            const requestId = extractUwsRequestId(request) ?? generateRequestId();
            const traceId = extractUwsTraceId(request) ?? generateTraceId();

            response.writeHeader("x-request-id", requestId);
            response.writeHeader("x-trace-id", traceId);

            this.writeSerializedUws(
                response,
                notFoundBody(this.errorHandler, snapshotRequest({
                    method: request.getMethod().toUpperCase(),
                    url: request.getUrl() || "/",
                    ...(request.getHeader("user-agent").length > 0
                        ? { userAgent: request.getHeader("user-agent") }
                        : {}),
                    requestId,
                    traceId,
                })),
            );
        });
    }

    private async dispatchUws(
        handler: (request: HttpRequest, response: MutableHttpResponse) => Promise<unknown>,
        request: UwsHttpRequest,
        response: UwsHttpResponse,
    ): Promise<void> {
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
            const httpRequest = await this.toHttpRequest(
                request,
                response,
                requestId,
                traceId,
            );
            await handler(httpRequest, writer);

            if (!aborted) {
                this.writeUws(response, writer);
            }
        } catch (exception) {
            if (!aborted) {
                this.writeSerializedUws(
                    response,
                    handleAdapterError(
                        this.errorHandler,
                        exception,
                        requestSnapshot,
                    ),
                );
            }
        }
    }

    private async toHttpRequest(
        request: UwsHttpRequest,
        response: UwsHttpResponse,
        requestId: string,
        traceId: string,
    ): Promise<HttpRequest> {
        const headers: Record<string, string | string[] | undefined> = {};

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
            cookies: parseCookies(
                typeof headers.cookie === "string" ? headers.cookie : undefined,
            ),
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

    private async readUwsBody(
        response: UwsHttpResponse,
        contentType: string | string[] | undefined,
    ): Promise<unknown> {
        const raw = await new Promise<string>((resolve, reject) => {
            const chunks: Buffer[] = [];

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
            return JSON.parse(raw) as unknown;
        }

        return raw;
    }

    private writeUws(
        response: UwsHttpResponse,
        writer: MutableHttpResponse,
    ): void {
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

    private writeSerializedUws(
        response: UwsHttpResponse,
        body: SerializedBody,
    ): void {
        response.cork(() => {
            response.writeStatus(getStatusLine(body.statusCode));

            for (const [name, value] of Object.entries(body.headers)) {
                const header = Array.isArray(value) ? value.join(", ") : value;
                response.writeHeader(name, header);
            }

            response.end(body.payload);
        });
    }

    private toUwsPath(
        path: string,
    ): string {
        return path;
    }

    private async loadUws(): Promise<UwsModule | undefined> {
        try {
            const loaded = await import("uWebSockets.js") as {
                default?: UwsModule;
            } & Partial<UwsModule>;

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
        } catch {
            return undefined;
        }
    }
}
