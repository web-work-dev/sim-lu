import { HttpException, NotFoundException } from "./http-exception.js";
import { ErrorHandler } from "./handler.js";
import { fromUploadError, isMulterError } from "./upload.js";
export function snapshotRequest(request) {
    const snapshot = {};
    if (request.method !== undefined) {
        Object.assign(snapshot, { method: request.method });
    }
    if (request.url !== undefined) {
        Object.assign(snapshot, { url: request.url });
    }
    if (request.ip !== undefined) {
        Object.assign(snapshot, { ip: request.ip });
    }
    if (request.userAgent !== undefined) {
        Object.assign(snapshot, { userAgent: request.userAgent });
    }
    if (request.requestId !== undefined) {
        Object.assign(snapshot, { requestId: request.requestId });
    }
    if (request.traceId !== undefined) {
        Object.assign(snapshot, { traceId: request.traceId });
    }
    return snapshot;
}
export function createPlatformErrorHandler(platform, options = {}) {
    return new ErrorHandler({
        service: options.service ?? `sim-lu-${platform}`,
        platform,
        ...options,
    });
}
export function resolveException(exception) {
    if (isMulterError(exception)) {
        return fromUploadError(exception);
    }
    if (isRecord(exception) && typeof exception.statusCode === "number" && typeof exception.message === "string") {
        return new HttpException(exception.statusCode, exception.message, {
            details: exception.details,
        });
    }
    return exception;
}
export function handleAdapterError(handler, exception, request) {
    return handler.handle(resolveException(exception), request);
}
export function notFoundBody(handler, request) {
    return handler.handle(new NotFoundException(), request);
}
export function applySerializedBody(response, body) {
    response.status = body.statusCode;
    for (const [name, value] of Object.entries(body.headers)) {
        response.setHeader(name, value);
    }
    response.send(JSON.parse(body.payload));
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
//# sourceMappingURL=adapter.js.map