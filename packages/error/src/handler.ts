import type { Logger } from "winston";

import { NotFoundException } from "./http-exception.js";
import { serializeJson } from "./json.js";
import { createErrorLogger, logNormalizedError, type LoggerOptions } from "./logger.js";
import {
    normalizeError,
    toFailureResponse,
    type FailureResponse,
    type RequestSnapshot,
} from "./response.js";

export interface SerializedBody {
    readonly payload: string;
    readonly contentType: string;
    readonly statusCode: number;
    readonly headers: Readonly<Record<string, string | string[]>>;
}

export function isSerializedBody(
    value: unknown,
): value is SerializedBody {
    return (
        typeof value === "object" &&
        value !== null &&
        "payload" in value &&
        typeof (value as SerializedBody).payload === "string" &&
        "statusCode" in value &&
        typeof (value as SerializedBody).statusCode === "number" &&
        "headers" in value &&
        "contentType" in value
    );
}

export interface ErrorHandlerOptions extends LoggerOptions {
    readonly includeDetails?: boolean;
    readonly includeStack?: boolean;
    readonly platform?: string;
}

export class ErrorHandler {
    private readonly logger: Logger;
    private readonly includeDetails: boolean;
    private readonly includeStack: boolean;
    private readonly platform: string | undefined;

    public constructor(
        options: ErrorHandlerOptions = {},
    ) {
        this.logger = createErrorLogger(options);
        this.includeDetails = options.includeDetails ?? true;
        this.includeStack = options.includeStack ?? false;
        this.platform = options.platform;
    }

    public getLogger(): Logger {
        return this.logger;
    }

    public handle(
        exception: unknown,
        request?: RequestSnapshot,
    ): SerializedBody {
        const normalized = normalizeError(exception);
        logNormalizedError(this.logger, normalized, request, this.platform);

        const body = toFailureResponse(exception, this.includeDetails);
        const payloadObject: FailureResponse & { readonly stack?: string } = this.includeStack && normalized.stack
            ? {
                ...body,
                stack: normalized.stack,
            }
            : body;

        return {
            payload: serializeJson(payloadObject),
            contentType: "application/json; charset=utf-8",
            statusCode: normalized.statusCode,
            headers: {
                "content-type": "application/json; charset=utf-8",
                ...normalized.headers,
            },
        };
    }

    public notFound(
        request?: RequestSnapshot,
    ): SerializedBody {
        return this.handle(new NotFoundException(), request);
    }
}
