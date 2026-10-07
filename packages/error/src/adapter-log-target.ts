import type { LogEntry } from "./logger.js";

export interface LogTargetConfig {
    readonly index?: string;
    readonly transformer?: (entry: LogEntry) => Record<string, unknown>;
}

export type LogSender = (
    entry: LogEntry,
    transformed: Record<string, unknown>,
) => void | Promise<void>;

export class AdapterLogTarget {
    public readonly name = "adapter";
    private readonly indexName: string;
    private readonly transform: (entry: LogEntry) => Record<string, unknown>;
    private readonly sender: LogSender;

    public constructor(
        sender: LogSender,
        config: LogTargetConfig = {},
    ) {
        this.sender = sender;
        this.indexName = config.index ?? "simlu-logs";
        this.transform = config.transformer ?? ((entry) => ({
            timestamp: entry.timestamp,
            level: entry.level,
            message: entry.message,
            ...(entry.requestId ? { requestId: entry.requestId } : {}),
            ...(entry.traceId ? { traceId: entry.traceId } : {}),
            ...(entry.platform ? { platform: entry.platform } : {}),
            ...(entry.service ? { service: entry.service } : {}),
            ...(entry.error ? { error: entry.error } : {}),
            ...(entry.request ? { request: entry.request } : {}),
            ...(entry.meta ? { meta: entry.meta } : {}),
        }));
    }

    public async send(entry: LogEntry): Promise<void> {
        await this.sender(entry, this.transform(entry));
    }

    public getIndex(): string {
        return this.indexName;
    }
}

export function createLogTarget(
    sender: LogSender,
    config: LogTargetConfig = {},
): AdapterLogTarget {
    return new AdapterLogTarget(sender, config);
}
