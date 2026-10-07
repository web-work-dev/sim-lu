import { Writable } from "node:stream";

import { createLogger, format, transports as winstonTransports, type Logger } from "winston";
import Transport from "winston-transport";

import { serializeJson } from "./json.js";
import type { NormalizedError, RequestSnapshot } from "./response.js";

export type LogLevel = "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";

export interface ExternalLogTarget {
    readonly name: string;
    send(entry: LogEntry): void | Promise<void>;
}

export interface LogEntry {
    readonly level: LogLevel;
    readonly message: string;
    readonly timestamp: string;
    readonly platform?: string;
    readonly service?: string;
    readonly requestId?: string;
    readonly traceId?: string;
    readonly request?: RequestSnapshot;
    readonly error?: {
        readonly name: string;
        readonly statusCode: number;
        readonly stack?: string;
        readonly details?: unknown;
    };
    readonly meta?: Readonly<Record<string, unknown>>;
}

export interface HttpLogTargetOptions {
    readonly host: string;
    readonly port?: number;
    readonly path?: string;
    readonly ssl?: boolean;
}

export interface LoggerOptions {
    readonly service?: string;
    readonly level?: LogLevel;
    readonly console?: boolean;
    readonly file?: string | false;
    readonly http?: HttpLogTargetOptions | false;
    readonly stream?: Writable | false;
    readonly silent?: boolean;
    readonly targets?: readonly ExternalLogTarget[];
}

class ExternalTransport extends Transport {
    public constructor(
        private readonly target: ExternalLogTarget,
    ) {
        super();
    }

    public override log(
        info: Record<string, unknown>,
        callback: () => void,
    ): void {
        const entry = toLogEntry(info);

        void Promise.resolve(this.target.send(entry)).catch(() => undefined);
        callback();
    }
}

export class MemoryLogTarget implements ExternalLogTarget {
    public readonly name = "memory";
    public readonly entries: LogEntry[] = [];

    public send(
        entry: LogEntry,
    ): void {
        this.entries.push(entry);
    }

    public clear(): void {
        this.entries.length = 0;
    }
}

export class ElasticLogTarget implements ExternalLogTarget {
    public readonly name = "elasticsearch";

    public constructor(
        private readonly sender: (entry: LogEntry) => void | Promise<void>,
    ) { }

    public send(
        entry: LogEntry,
    ): void | Promise<void> {
        return this.sender(entry);
    }
}

export class StreamLogTarget implements ExternalLogTarget {
    public readonly name = "stream";

    public constructor(
        private readonly stream: Writable,
    ) { }

    public send(
        entry: LogEntry,
    ): void {
        this.stream.write(`${serializeJson(entry)}\n`);
    }
}

export class WebhookLogTarget implements ExternalLogTarget {
    public readonly name = "webhook";

    public constructor(
        private readonly url: string,
        private readonly fetchImpl: typeof fetch = fetch,
    ) { }

    public async send(
        entry: LogEntry,
    ): Promise<void> {
        await this.fetchImpl(this.url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: serializeJson(entry),
        });
    }
}

export function createErrorLogger(
    options: LoggerOptions = {},
): Logger {
    const loggerTransports: Transport[] = [];

    if (options.console !== false) {
        loggerTransports.push(new winstonTransports.Console({
            format: format.combine(
                format.colorize(),
                format.timestamp(),
                format.printf((info) => formatConsoleLine(info)),
            ),
        }));
    }

    if (typeof options.file === "string" && options.file.length > 0) {
        loggerTransports.push(new winstonTransports.File({
            filename: options.file,
            format: format.combine(
                format.timestamp(),
                format.json(),
            ),
        }));
    }

    if (options.http) {
        const httpTransport: {
            host: string;
            port?: number;
            path?: string;
            ssl?: boolean;
        } = {
            host: options.http.host,
        };

        if (options.http.port !== undefined) {
            httpTransport.port = options.http.port;
        }

        if (options.http.path !== undefined) {
            httpTransport.path = options.http.path;
        }

        if (options.http.ssl !== undefined) {
            httpTransport.ssl = options.http.ssl;
        }

        loggerTransports.push(new winstonTransports.Http(httpTransport));
    }

    if (options.stream) {
        loggerTransports.push(new winstonTransports.Stream({
            stream: options.stream,
            format: format.combine(
                format.timestamp(),
                format.json(),
            ),
        }));
    }

    for (const target of options.targets ?? []) {
        loggerTransports.push(new ExternalTransport(target));
    }

    return createLogger({
        level: options.level ?? "info",
        defaultMeta: {
            service: options.service ?? "sim-lu",
        },
        silent: options.silent ?? false,
        format: format.combine(
            format.timestamp(),
            format.errors({ stack: true }),
            format.json(),
        ),
        transports: loggerTransports,
    });
}

export function logNormalizedError(
    logger: Logger,
    normalized: NormalizedError,
    request?: RequestSnapshot,
    platform?: string,
): void {
    const level: LogLevel = normalized.statusCode >= 500 ? "error" : "warn";

    logger.log(level, normalized.message, {
        platform,
        request,
        ...(request?.requestId ? { requestId: request.requestId } : {}),
        ...(request?.traceId ? { traceId: request.traceId } : {}),
        error: {
            name: normalized.name,
            statusCode: normalized.statusCode,
            stack: normalized.stack,
            details: normalized.details,
        },
    });
}

function toLogEntry(
    info: Record<string, unknown>,
): LogEntry {
    const timestamp = typeof info.timestamp === "string"
        ? info.timestamp
        : new Date().toISOString();
    const error = isRecord(info.error) ? info.error : undefined;
    const request = isRecord(info.request) ? info.request as RequestSnapshot : undefined;

    return {
        level: (typeof info.level === "string" ? info.level : "info") as LogLevel,
        message: typeof info.message === "string" ? info.message : String(info.message ?? ""),
        timestamp,
        ...(typeof info.platform === "string" ? { platform: info.platform } : {}),
        ...(typeof info.service === "string" ? { service: info.service } : {}),
        ...(typeof info.requestId === "string" ? { requestId: info.requestId } : {}),
        ...(typeof info.traceId === "string" ? { traceId: info.traceId } : {}),
        ...(request ? { request } : {}),
        ...(error ? {
            error: {
                name: String(error.name ?? "Error"),
                statusCode: Number(error.statusCode ?? 500),
                ...(typeof error.stack === "string" ? { stack: error.stack } : {}),
                ...(error.details !== undefined ? { details: error.details } : {}),
            },
        } : {}),
        meta: info,
    };
}

function formatConsoleLine(
    info: Record<string, unknown>,
): string {
    const timestamp = String(info.timestamp ?? "");
    const level = String(info.level ?? "info");
    const message = String(info.message ?? "");
    const platform = typeof info.platform === "string" ? ` [${info.platform}]` : "";
    const requestId = typeof info.requestId === "string" ? ` [${info.requestId.slice(0, 8)}]` : "";
    const request = isRecord(info.request)
        ? ` ${String(info.request.method ?? "")} ${String(info.request.url ?? "")}`
        : "";
    const error = isRecord(info.error) ? ` (${String(info.error.name ?? "Error")} ${String(info.error.statusCode ?? "")})` : "";

    return `${timestamp} ${level}${platform}${requestId}${request}${error}: ${message}`;
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
