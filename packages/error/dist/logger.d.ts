import { Writable } from "node:stream";
import { type Logger } from "winston";
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
export declare class MemoryLogTarget implements ExternalLogTarget {
    readonly name = "memory";
    readonly entries: LogEntry[];
    send(entry: LogEntry): void;
    clear(): void;
}
export declare class ElasticLogTarget implements ExternalLogTarget {
    private readonly sender;
    readonly name = "elasticsearch";
    constructor(sender: (entry: LogEntry) => void | Promise<void>);
    send(entry: LogEntry): void | Promise<void>;
}
export declare class StreamLogTarget implements ExternalLogTarget {
    private readonly stream;
    readonly name = "stream";
    constructor(stream: Writable);
    send(entry: LogEntry): void;
}
export declare class WebhookLogTarget implements ExternalLogTarget {
    private readonly url;
    private readonly fetchImpl;
    readonly name = "webhook";
    constructor(url: string, fetchImpl?: typeof fetch);
    send(entry: LogEntry): Promise<void>;
}
export declare function createErrorLogger(options?: LoggerOptions): Logger;
export declare function logNormalizedError(logger: Logger, normalized: NormalizedError, request?: RequestSnapshot, platform?: string): void;
//# sourceMappingURL=logger.d.ts.map