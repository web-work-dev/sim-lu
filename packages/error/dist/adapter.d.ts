import { ErrorHandler, type ErrorHandlerOptions, type SerializedBody } from "./handler.js";
import type { RequestSnapshot } from "./response.js";
export interface WritableHttpResponse {
    status: number;
    setHeader(name: string, value: string | string[]): unknown;
    send(body: unknown): unknown;
}
export declare function snapshotRequest(request: {
    readonly method?: string;
    readonly url?: string;
    readonly ip?: string;
    readonly userAgent?: string;
    readonly requestId?: string;
    readonly traceId?: string;
}): RequestSnapshot;
export declare function createPlatformErrorHandler(platform: string, options?: ErrorHandlerOptions): ErrorHandler;
export declare function resolveException(exception: unknown): unknown;
export declare function handleAdapterError(handler: ErrorHandler, exception: unknown, request?: RequestSnapshot): SerializedBody;
export declare function notFoundBody(handler: ErrorHandler, request?: RequestSnapshot): SerializedBody;
export declare function applySerializedBody(response: WritableHttpResponse, body: SerializedBody): void;
//# sourceMappingURL=adapter.d.ts.map