import { ErrorHandler, type ErrorHandlerOptions } from "./handler.js";
import { type SerializedBody } from "./handler.js";
import { snapshotRequest } from "./adapter.js";
import type { RequestSnapshot } from "./response.js";

export interface ExceptionCatchContext {
    get<T>(
        key: string,
    ): T | undefined;
}

export interface DefaultExceptionFilterOptions extends ErrorHandlerOptions {
    readonly includeDetails?: boolean;
}

export class DefaultExceptionFilter {
    private readonly handler: ErrorHandler;
    private readonly includeDetails: boolean;

    public constructor(
        options: DefaultExceptionFilterOptions | ErrorHandler = {},
    ) {
        if (options instanceof ErrorHandler) {
            this.handler = options;
            this.includeDetails = true;
        } else {
            this.handler = new ErrorHandler({
                console: options.console ?? false,
                ...options,
            });
            this.includeDetails = options.includeDetails ?? true;
        }
    }

    public getHandler(): ErrorHandler {
        return this.handler;
    }

    public catch(
        exception: unknown,
        context?: ExceptionCatchContext,
    ): SerializedBody {
        const request = this.snapshot(context);
        return this.handler.handle(exception, request);
    }

    private snapshot(
        context: ExceptionCatchContext | undefined,
    ): RequestSnapshot | undefined {
        const request = context?.get<{
            readonly method?: string;
            readonly url?: string;
            readonly ip?: string;
            readonly userAgent?: string;
            readonly requestId?: string;
            readonly traceId?: string;
        }>("request");

        if (!request) {
            return undefined;
        }

        return snapshotRequest(request);
    }
}

export function createDefaultExceptionFilter(
    options: DefaultExceptionFilterOptions = {},
): DefaultExceptionFilter {
    return new DefaultExceptionFilter(options);
}
