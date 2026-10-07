import { ErrorHandler, type ErrorHandlerOptions } from "./handler.js";
import { type SerializedBody } from "./handler.js";
export interface ExceptionCatchContext {
    get<T>(key: string): T | undefined;
}
export interface DefaultExceptionFilterOptions extends ErrorHandlerOptions {
    readonly includeDetails?: boolean;
}
export declare class DefaultExceptionFilter {
    private readonly handler;
    private readonly includeDetails;
    constructor(options?: DefaultExceptionFilterOptions | ErrorHandler);
    getHandler(): ErrorHandler;
    catch(exception: unknown, context?: ExceptionCatchContext): SerializedBody;
    private snapshot;
}
export declare function createDefaultExceptionFilter(options?: DefaultExceptionFilterOptions): DefaultExceptionFilter;
//# sourceMappingURL=default-filter.d.ts.map