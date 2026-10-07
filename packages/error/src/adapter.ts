import { HttpException, NotFoundException } from "./http-exception.js";
import { ErrorHandler, type ErrorHandlerOptions, type SerializedBody } from "./handler.js";
import type { RequestSnapshot } from "./response.js";
import { fromUploadError, isMulterError } from "./upload.js";

export interface WritableHttpResponse {
    status: number;
    setHeader(name: string, value: string | string[]): unknown;
    send(body: unknown): unknown;
}

export function snapshotRequest(
    request: {
        readonly method?: string;
        readonly url?: string;
        readonly ip?: string;
        readonly userAgent?: string;
        readonly requestId?: string;
        readonly traceId?: string;
    },
): RequestSnapshot {
    const snapshot: RequestSnapshot = {};

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

export function createPlatformErrorHandler(
    platform: string,
    options: ErrorHandlerOptions = {},
): ErrorHandler {
    return new ErrorHandler({
        service: options.service ?? `sim-lu-${platform}`,
        platform,
        ...options,
    });
}

export function resolveException(
    exception: unknown,
): unknown {
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

export function handleAdapterError(
    handler: ErrorHandler,
    exception: unknown,
    request?: RequestSnapshot,
): SerializedBody {
    return handler.handle(resolveException(exception), request);
}

export function notFoundBody(
    handler: ErrorHandler,
    request?: RequestSnapshot,
): SerializedBody {
    return handler.handle(new NotFoundException(), request);
}

export function applySerializedBody(
    response: WritableHttpResponse,
    body: SerializedBody,
): void {
    response.status = body.statusCode;

    for (const [name, value] of Object.entries(body.headers)) {
        response.setHeader(name, value);
    }

    response.send(JSON.parse(body.payload) as unknown);
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
