import { type HttpStatusCode } from "./http-status.js";
import { HttpException, type ErrorBody } from "./http-exception.js";
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
export declare function ok<T>(data: T, statusCode?: HttpStatusCode, meta?: Readonly<Record<string, unknown>>): SuccessResponse<T>;
export declare function created<T>(data: T, meta?: Readonly<Record<string, unknown>>): SuccessResponse<T>;
export declare function noContent(): SuccessResponse<null>;
export declare function fail(statusCode: number, message: string, details?: unknown): FailureResponse;
export declare function normalizeError(exception: unknown): NormalizedError;
export declare function toErrorBody(exception: unknown, includeDetails?: boolean): ErrorBody;
export declare function toFailureResponse(exception: unknown, includeDetails?: boolean): FailureResponse;
export declare function fromHttpException(exception: HttpException): FailureResponse;
//# sourceMappingURL=response.d.ts.map