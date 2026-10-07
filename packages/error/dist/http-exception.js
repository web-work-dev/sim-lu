import { getStatusName, HttpStatus } from "./http-status.js";
export class HttpException extends Error {
    statusCode;
    error;
    details;
    headers;
    cause;
    constructor(statusCode, message, options = {}) {
        super(message);
        this.name = "HttpException";
        this.statusCode = statusCode;
        this.error = getStatusName(statusCode);
        this.details = options.details;
        this.headers = options.headers ?? {};
        this.cause = options.cause;
        Object.setPrototypeOf(this, new.target.prototype);
    }
    toJSON() {
        const body = {
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
export class BadRequestException extends HttpException {
    constructor(message = "Bad Request", options) {
        super(HttpStatus.BAD_REQUEST, message, options);
        this.name = "BadRequestException";
    }
}
export class UnauthorizedException extends HttpException {
    constructor(message = "Unauthorized", options) {
        super(HttpStatus.UNAUTHORIZED, message, options);
        this.name = "UnauthorizedException";
    }
}
export class PaymentRequiredException extends HttpException {
    constructor(message = "Payment Required", options) {
        super(HttpStatus.PAYMENT_REQUIRED, message, options);
        this.name = "PaymentRequiredException";
    }
}
export class ForbiddenException extends HttpException {
    constructor(message = "Forbidden", options) {
        super(HttpStatus.FORBIDDEN, message, options);
        this.name = "ForbiddenException";
    }
}
export class NotFoundException extends HttpException {
    constructor(message = "Not Found", options) {
        super(HttpStatus.NOT_FOUND, message, options);
        this.name = "NotFoundException";
    }
}
export class MethodNotAllowedException extends HttpException {
    constructor(message = "Method Not Allowed", options) {
        super(HttpStatus.METHOD_NOT_ALLOWED, message, options);
        this.name = "MethodNotAllowedException";
    }
}
export class NotAcceptableException extends HttpException {
    constructor(message = "Not Acceptable", options) {
        super(HttpStatus.NOT_ACCEPTABLE, message, options);
        this.name = "NotAcceptableException";
    }
}
export class ConflictException extends HttpException {
    constructor(message = "Conflict", options) {
        super(HttpStatus.CONFLICT, message, options);
        this.name = "ConflictException";
    }
}
export class GoneException extends HttpException {
    constructor(message = "Gone", options) {
        super(HttpStatus.GONE, message, options);
        this.name = "GoneException";
    }
}
export class PayloadTooLargeException extends HttpException {
    constructor(message = "Payload Too Large", options) {
        super(HttpStatus.PAYLOAD_TOO_LARGE, message, options);
        this.name = "PayloadTooLargeException";
    }
}
export class UnsupportedMediaTypeException extends HttpException {
    constructor(message = "Unsupported Media Type", options) {
        super(HttpStatus.UNSUPPORTED_MEDIA_TYPE, message, options);
        this.name = "UnsupportedMediaTypeException";
    }
}
export class UnprocessableEntityException extends HttpException {
    constructor(message = "Unprocessable Entity", options) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, message, options);
        this.name = "UnprocessableEntityException";
    }
}
export class TooManyRequestsException extends HttpException {
    constructor(message = "Too Many Requests", options) {
        super(HttpStatus.TOO_MANY_REQUESTS, message, options);
        this.name = "TooManyRequestsException";
    }
}
export class InternalServerErrorException extends HttpException {
    constructor(message = "Internal Server Error", options) {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message, options);
        this.name = "InternalServerErrorException";
    }
}
export class NotImplementedException extends HttpException {
    constructor(message = "Not Implemented", options) {
        super(HttpStatus.NOT_IMPLEMENTED, message, options);
        this.name = "NotImplementedException";
    }
}
export class BadGatewayException extends HttpException {
    constructor(message = "Bad Gateway", options) {
        super(HttpStatus.BAD_GATEWAY, message, options);
        this.name = "BadGatewayException";
    }
}
export class ServiceUnavailableException extends HttpException {
    constructor(message = "Service Unavailable", options) {
        super(HttpStatus.SERVICE_UNAVAILABLE, message, options);
        this.name = "ServiceUnavailableException";
    }
}
export class GatewayTimeoutException extends HttpException {
    constructor(message = "Gateway Timeout", options) {
        super(HttpStatus.GATEWAY_TIMEOUT, message, options);
        this.name = "GatewayTimeoutException";
    }
}
export function isHttpException(value) {
    return value instanceof HttpException;
}
export function isHttpStatusCode(value) {
    return Object.values(HttpStatus).includes(value);
}
//# sourceMappingURL=http-exception.js.map