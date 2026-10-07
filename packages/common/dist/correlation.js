let nodeRandom;
try {
    const crypto = await import("node:crypto");
    nodeRandom = () => crypto.randomBytes(16).readUInt32LE(0) / 0xffffffff;
}
catch {
    nodeRandom = Math.random;
}
export function generateRequestId() {
    const timestamp = Date.now().toString(36);
    const random1 = Math.floor(nodeRandom() * 0x1000000).toString(36).padStart(6, "0");
    const random2 = Math.floor(nodeRandom() * 0x1000000).toString(36).padStart(6, "0");
    return `${timestamp}-${random1}-${random2}`;
}
export function generateTraceId() {
    const timestamp = Date.now().toString(36);
    const random = Math.floor(nodeRandom() * 0x100000000).toString(36).padStart(8, "0");
    return `${timestamp}-${random}`;
}
export function generateSpanId() {
    return Math.floor(nodeRandom() * 0x100000000).toString(36).padStart(8, "0");
}
export function extractRequestId(headers) {
    const header = headers["x-request-id"] ?? headers["x-correlation-id"];
    if (typeof header === "string") {
        return header;
    }
    if (Array.isArray(header) && header.length > 0) {
        return header[0];
    }
    return undefined;
}
export function extractTraceId(headers) {
    const header = headers["x-trace-id"];
    if (typeof header === "string") {
        return header;
    }
    if (Array.isArray(header) && header.length > 0) {
        return header[0];
    }
    return undefined;
}
//# sourceMappingURL=correlation.js.map