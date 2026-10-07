import { getStatusName, HttpStatus, type HttpStatusCode } from "./http-status.js";

export interface HttpExceptionOptions {
    readonly cause?: unknown;
    readonly details?: unknown;
    readonly headers?: Readonly<Record<string, string | string[]>>;
}

export class HttpException extends Error {
    public readonly statusCode: number;
    public readonly error: string;
    public readonly details: unknown;
    public readonly headers: Readonly<Record<string, string | string[]>>;
    public override readonly cause: unknown;

    public constructor(
        statusCode: number,
        message: string,
        options: HttpExceptionOptions = {},
    ) {
        super(message);
        this.name = "HttpException";
        this.statusCode = statusCode;
        this.error = getStatusName(statusCode);
        this.details = options.details;
        this.headers = options.headers ?? {};
        this.cause = options.cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }

    public toJSON(): ErrorBody {
        const body: ErrorBody = {
            statusCode: this.statusCode,
            error: this.error,
            message: this.message,
        };

        if (this.details !== undefined) {
            body.details = this.details;
        }

        return body;
    }
}

export interface ErrorBody {
    statusCode: number;
    error: string;
    message: string;
    details?: unknown;
}

export class BadRequestException extends HttpException {
    public constructor(message = "Bad Request", options?: HttpExceptionOptions) {
        super(HttpStatus.BAD_REQUEST, message, options);
        this.name = "BadRequestException";
    }
}

export class UnauthorizedException extends HttpException {
    public constructor(message = "Unauthorized", options?: HttpExceptionOptions) {
        super(HttpStatus.UNAUTHORIZED, message, options);
        this.name = "UnauthorizedException";
    }
}

export class PaymentRequiredException extends HttpException {
    public constructor(message = "Payment Required", options?: HttpExceptionOptions) {
        super(HttpStatus.PAYMENT_REQUIRED, message, options);
        this.name = "PaymentRequiredException";
    }
}

export class ForbiddenException extends HttpException {
    public constructor(message = "Forbidden", options?: HttpExceptionOptions) {
        super(HttpStatus.FORBIDDEN, message, options);
        this.name = "ForbiddenException";
    }
}

export class NotFoundException extends HttpException {
    public constructor(message = "Not Found", options?: HttpExceptionOptions) {
        super(HttpStatus.NOT_FOUND, message, options);
        this.name = "NotFoundException";
    }
}

export class MethodNotAllowedException extends HttpException {
    public constructor(message = "Method Not Allowed", options?: HttpExceptionOptions) {
        super(HttpStatus.METHOD_NOT_ALLOWED, message, options);
        this.name = "MethodNotAllowedException";
    }
}

export class NotAcceptableException extends HttpException {
    public constructor(message = "Not Acceptable", options?: HttpExceptionOptions) {
        super(HttpStatus.NOT_ACCEPTABLE, message, options);
        this.name = "NotAcceptableException";
    }
}

export class ConflictException extends HttpException {
    public constructor(message = "Conflict", options?: HttpExceptionOptions) {
        super(HttpStatus.CONFLICT, message, options);
        this.name = "ConflictException";
    }
}

export class GoneException extends HttpException {
    public constructor(message = "Gone", options?: HttpExceptionOptions) {
        super(HttpStatus.GONE, message, options);
        this.name = "GoneException";
    }
}

export class PayloadTooLargeException extends HttpException {
    public constructor(message = "Payload Too Large", options?: HttpExceptionOptions) {
        super(HttpStatus.PAYLOAD_TOO_LARGE, message, options);
        this.name = "PayloadTooLargeException";
    }
}

export class UnsupportedMediaTypeException extends HttpException {
    public constructor(message = "Unsupported Media Type", options?: HttpExceptionOptions) {
        super(HttpStatus.UNSUPPORTED_MEDIA_TYPE, message, options);
        this.name = "UnsupportedMediaTypeException";
    }
}

export class UnprocessableEntityException extends HttpException {
    public constructor(message = "Unprocessable Entity", options?: HttpExceptionOptions) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, message, options);
        this.name = "UnprocessableEntityException";
    }
}

export class TooManyRequestsException extends HttpException {
    public constructor(message = "Too Many Requests", options?: HttpExceptionOptions) {
        super(HttpStatus.TOO_MANY_REQUESTS, message, options);
        this.name = "TooManyRequestsException";
    }
}

export class InternalServerErrorException extends HttpException {
    public constructor(message = "Internal Server Error", options?: HttpExceptionOptions) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message, options);
        this.name = "InternalServerErrorException";
    }
}

export class NotImplementedException extends HttpException {
    public constructor(message = "Not Implemented", options?: HttpExceptionOptions) {
        super(HttpStatus.NOT_IMPLEMENTED, message, options);
        this.name = "NotImplementedException";
    }
}

export class BadGatewayException extends HttpException {
    public constructor(message = "Bad Gateway", options?: HttpExceptionOptions) {
        super(HttpStatus.BAD_GATEWAY, message, options);
        this.name = "BadGatewayException";
    }
}

export class ServiceUnavailableException extends HttpException {
    public constructor(message = "Service Unavailable", options?: HttpExceptionOptions) {
        super(HttpStatus.SERVICE_UNAVAILABLE, message, options);
        this.name = "ServiceUnavailableException";
    }
}

export class GatewayTimeoutException extends HttpException {
    public constructor(message = "Gateway Timeout", options?: HttpExceptionOptions) {
        super(HttpStatus.GATEWAY_TIMEOUT, message, options);
        this.name = "GatewayTimeoutException";
    }
}

export function isHttpException(
    value: unknown,
): value is HttpException {
    return value instanceof HttpException;
}

export function isHttpStatusCode(
    value: number,
): value is HttpStatusCode {
    return Object.values(HttpStatus).includes(value as HttpStatusCode);
}
