export class AdapterLogTarget {
    name = "adapter";
    indexName;
    transform;
    sender;
    constructor(sender, config = {}) {
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
    async send(entry) {
        await this.sender(entry, this.transform(entry));
    }
    getIndex() {
        return this.indexName;
    }
}
export function createLogTarget(sender, config = {}) {
    return new AdapterLogTarget(sender, config);
}
//# sourceMappingURL=adapter-log-target.js.map