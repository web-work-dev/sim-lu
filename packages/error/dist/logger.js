import { Writable } from "node:stream";
import { createLogger, format, transports as winstonTransports } from "winston";
import Transport from "winston-transport";
import { serializeJson } from "./json.js";
class ExternalTransport extends Transport {
    target;
    constructor(target) {
        super();
        this.target = target;
    }
    log(info, callback) {
        const entry = toLogEntry(info);
        void Promise.resolve(this.target.send(entry)).catch(() => undefined);
        callback();
    }
}
export class MemoryLogTarget {
    name = "memory";
    entries = [];
    send(entry) {
        this.entries.push(entry);
    }
    clear() {
        this.entries.length = 0;
    }
}
export class ElasticLogTarget {
    sender;
    name = "elasticsearch";
    constructor(sender) {
        this.sender = sender;
    }
    send(entry) {
        return this.sender(entry);
    }
}
export class StreamLogTarget {
    stream;
    name = "stream";
    constructor(stream) {
        this.stream = stream;
    }
    send(entry) {
        this.stream.write(`${serializeJson(entry)}\n`);
    }
}
export class WebhookLogTarget {
    url;
    fetchImpl;
    name = "webhook";
    constructor(url, fetchImpl = fetch) {
        this.url = url;
        this.fetchImpl = fetchImpl;
    }
    async send(entry) {
        await this.fetchImpl(this.url, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: serializeJson(entry),
        });
    }
}
export function createErrorLogger(options = {}) {
    const loggerTransports = [];
    if (options.console !== false) {
        loggerTransports.push(new winstonTransports.Console({
            format: format.combine(format.colorize(), format.timestamp(), format.printf((info) => formatConsoleLine(info))),
        }));
    }
    if (typeof options.file === "string" && options.file.length > 0) {
        loggerTransports.push(new winstonTransports.File({
            filename: options.file,
            format: format.combine(format.timestamp(), format.json()),
        }));
    }
    if (options.http) {
        const httpTransport = {
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
            format: format.combine(format.timestamp(), format.json()),
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
        format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
        transports: loggerTransports,
    });
}
export function logNormalizedError(logger, normalized, request, platform) {
    const level = normalized.statusCode >= 500 ? "error" : "warn";
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
function toLogEntry(info) {
    const timestamp = typeof info.timestamp === "string"
        ? info.timestamp
        : new Date().toISOString();
    const error = isRecord(info.error) ? info.error : undefined;
    const request = isRecord(info.request) ? info.request : undefined;
    return {
        level: (typeof info.level === "string" ? info.level : "info"),
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
function formatConsoleLine(info) {
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
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
//# sourceMappingURL=logger.js.map