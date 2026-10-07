import { NotFoundException } from "./http-exception.js";
import { serializeJson } from "./json.js";
import { createErrorLogger, logNormalizedError } from "./logger.js";
import { normalizeError, toFailureResponse, } from "./response.js";
export function isSerializedBody(value) {
    return (typeof value === "object" &&
        value !== null &&
        "payload" in value &&
        typeof value.payload === "string" &&
        "statusCode" in value &&
        typeof value.statusCode === "number" &&
        "headers" in value &&
        "contentType" in value);
}
export class ErrorHandler {
    logger;
    includeDetails;
    includeStack;
    platform;
    constructor(options = {}) {
        this.logger = createErrorLogger(options);
        this.includeDetails = options.includeDetails ?? true;
        this.includeStack = options.includeStack ?? false;
        this.platform = options.platform;
    }
    getLogger() {
        return this.logger;
    }
    handle(exception, request) {
        const normalized = normalizeError(exception);
        logNormalizedError(this.logger, normalized, request, this.platform);
        const body = toFailureResponse(exception, this.includeDetails);
        const payloadObject = this.includeStack && normalized.stack
            ? {
                ...body,
                stack: normalized.stack,
            }
            : body;
        return {
            payload: serializeJson(payloadObject),
            contentType: "application/json; charset=utf-8",
            statusCode: normalized.statusCode,
            headers: {
                "content-type": "application/json; charset=utf-8",
                ...normalized.headers,
            },
        };
    }
    notFound(request) {
        return this.handle(new NotFoundException(), request);
    }
}
//# sourceMappingURL=handler.js.map