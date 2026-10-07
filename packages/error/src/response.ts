import { getStatusName, HttpStatus, type HttpStatusCode } from "./http-status.js";
import {
    HttpException,
    isHttpException,
    type ErrorBody,
} from "./http-exception.js";

export interface SuccessResponse<T = unknown> {
    readonly success: true;
    readonly statusCode: number;
    readonly data: T;
    readonly meta?: Readonly<Record<string, unknown>>;
}

export interface FailureResponse {
    readonly success: false;
    readonly statusCode: number;
    readonly error: string;
    readonly message: string;
    readonly details?: unknown;
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | FailureResponse;

export interface RequestSnapshot {
    readonly method?: string;
    readonly url?: string;
    readonly ip?: string;
    readonly userAgent?: string;
    readonly requestId?: string;
    readonly traceId?: string;
}

export interface NormalizedError {
    readonly statusCode: number;
    readonly error: string;
    readonly message: string;
    readonly details: unknown;
    readonly headers: Readonly<Record<string, string | string[]>>;
    readonly stack: string | undefined;
    readonly name: string;
    readonly cause: unknown;
    readonly exception: unknown;
}

export function ok<T>(
    data: T,
    statusCode: HttpStatusCode = HttpStatus.OK,
    meta?: Readonly<Record<string, unknown>>,
): SuccessResponse<T> {
    const body: SuccessResponse<T> = {
        success: true,
        statusCode,
        data,
    };

    if (meta !== undefined) {
        return {
            ...body,
            meta,
        };
    }

    return body;
}

export function created<T>(
    data: T,
    meta?: Readonly<Record<string, unknown>>,
): SuccessResponse<T> {
    return ok(data, HttpStatus.CREATED, meta);
}

export function noContent(): SuccessResponse<null> {
    return ok(null, HttpStatus.NO_CONTENT);
}

export function fail(
    statusCode: number,
    message: string,
    details?: unknown,
): FailureResponse {
    const body: FailureResponse = {
        success: false,
        statusCode,
        error: getStatusName(statusCode),
        message,
    };

    if (details !== undefined) {
        return {
            ...body,
            details,
        };
    }

    return body;
}

export function normalizeError(
    exception: unknown,
): NormalizedError {
    if (isHttpException(exception)) {
        return {
            statusCode: exception.statusCode,
            error: exception.error,
            message: exception.message,
            details: exception.details,
            headers: exception.headers,
            stack: exception.stack,
            name: exception.name,
            cause: exception.cause,
            exception,
        };
    }

    if (exception instanceof Error) {
        const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

        return {
            statusCode,
            error: getStatusName(statusCode),
            message: exception.message || "Internal Server Error",
            details: undefined,
            headers: {},
            stack: exception.stack,
            name: exception.name,
            cause: exception.cause,
            exception,
        };
    }

    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    return {
        statusCode,
        error: getStatusName(statusCode),
        message: stringifyUnknown(exception),
        details: exception,
        headers: {},
        stack: undefined,
        name: "UnknownError",
        cause: undefined,
        exception,
    };
}

export function toErrorBody(
    exception: unknown,
    includeDetails = true,
): ErrorBody {
    const normalized = normalizeError(exception);
    const body: ErrorBody = {
        statusCode: normalized.statusCode,
        error: normalized.error,
        message: normalized.message,
    };

    if (includeDetails && normalized.details !== undefined) {
        body.details = normalized.details;
    }

    return body;
}

export function toFailureResponse(
    exception: unknown,
    includeDetails = true,
): FailureResponse {
    const normalized = normalizeError(exception);
    return fail(
        normalized.statusCode,
        normalized.message,
        includeDetails ? normalized.details : undefined,
    );
}

export function fromHttpException(
    exception: HttpException,
): FailureResponse {
    return toFailureResponse(exception);
}

function stringifyUnknown(
    value: unknown,
): string {
    if (typeof value === "string" && value.length > 0) {
        return value;
    }

    try {
        return JSON.stringify(value) ?? "Internal Server Error";
    } catch {
        return "Internal Server Error";
    }
}
