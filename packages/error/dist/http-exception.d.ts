import { type HttpStatusCode } from "./http-status.js";
export interface HttpExceptionOptions {
    readonly cause?: unknown;
    readonly details?: unknown;
    readonly headers?: Readonly<Record<string, string | string[]>>;
}
export declare class HttpException extends Error {
    readonly statusCode: number;
    readonly error: string;
    readonly details: unknown;
    readonly headers: Readonly<Record<string, string | string[]>>;
    readonly cause: unknown;
    constructor(statusCode: number, message: string, options?: HttpExceptionOptions);
    toJSON(): ErrorBody;
}
export interface ErrorBody {
    statusCode: number;
    error: string;
    message: string;
    details?: unknown;
}
export declare class BadRequestException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class UnauthorizedException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class PaymentRequiredException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class ForbiddenException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class NotFoundException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class MethodNotAllowedException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class NotAcceptableException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class ConflictException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class GoneException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class PayloadTooLargeException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class UnsupportedMediaTypeException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class UnprocessableEntityException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class TooManyRequestsException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class InternalServerErrorException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class NotImplementedException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class BadGatewayException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class ServiceUnavailableException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare class GatewayTimeoutException extends HttpException {
    constructor(message?: string, options?: HttpExceptionOptions);
}
export declare function isHttpException(value: unknown): value is HttpException;
export declare function isHttpStatusCode(value: number): value is HttpStatusCode;
//# sourceMappingURL=http-exception.d.ts.map