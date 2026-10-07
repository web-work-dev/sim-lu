import { getStatusName, HttpStatus } from "./http-status.js";
import { HttpException, isHttpException, } from "./http-exception.js";
export function ok(data, statusCode = HttpStatus.OK, meta) {
    const body = {
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
export function created(data, meta) {
    return ok(data, HttpStatus.CREATED, meta);
}
export function noContent() {
    return ok(null, HttpStatus.NO_CONTENT);
}
export function fail(statusCode, message, details) {
    const body = {
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
export function normalizeError(exception) {
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
export function toErrorBody(exception, includeDetails = true) {
    const normalized = normalizeError(exception);
    const body = {
        statusCode: normalized.statusCode,
        error: normalized.error,
        message: normalized.message,
    };
    if (includeDetails && normalized.details !== undefined) {
        body.details = normalized.details;
    }
    return body;
}
export function toFailureResponse(exception, includeDetails = true) {
    const normalized = normalizeError(exception);
    return fail(normalized.statusCode, normalized.message, includeDetails ? normalized.details : undefined);
}
export function fromHttpException(exception) {
    return toFailureResponse(exception);
}
function stringifyUnknown(value) {
    if (typeof value === "string" && value.length > 0) {
        return value;
    }
    try {
        return JSON.stringify(value) ?? "Internal Server Error";
    }
    catch {
        return "Internal Server Error";
    }
}
//# sourceMappingURL=response.js.map