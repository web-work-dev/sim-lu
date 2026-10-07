import type { LogEntry } from "./logger.js";
export interface LogTargetConfig {
    readonly index?: string;
    readonly transformer?: (entry: LogEntry) => Record<string, unknown>;
}
export type LogSender = (entry: LogEntry, transformed: Record<string, unknown>) => void | Promise<void>;
export declare class AdapterLogTarget {
    readonly name = "adapter";
    private readonly indexName;
    private readonly transform;
    private readonly sender;
    constructor(sender: LogSender, config?: LogTargetConfig);
    send(entry: LogEntry): Promise<void>;
    getIndex(): string;
}
export declare function createLogTarget(sender: LogSender, config?: LogTargetConfig): AdapterLogTarget;
//# sourceMappingURL=adapter-log-target.d.ts.map