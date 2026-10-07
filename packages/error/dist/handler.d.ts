import type { Logger } from "winston";
import { type LoggerOptions } from "./logger.js";
import { type RequestSnapshot } from "./response.js";
export interface SerializedBody {
    readonly payload: string;
    readonly contentType: string;
    readonly statusCode: number;
    readonly headers: Readonly<Record<string, string | string[]>>;
}
export declare function isSerializedBody(value: unknown): value is SerializedBody;
export interface ErrorHandlerOptions extends LoggerOptions {
    readonly includeDetails?: boolean;
    readonly includeStack?: boolean;
    readonly platform?: string;
}
export declare class ErrorHandler {
    private readonly logger;
    private readonly includeDetails;
    private readonly includeStack;
    private readonly platform;
    constructor(options?: ErrorHandlerOptions);
    getLogger(): Logger;
    handle(exception: unknown, request?: RequestSnapshot): SerializedBody;
    notFound(request?: RequestSnapshot): SerializedBody;
}
//# sourceMappingURL=handler.d.ts.map