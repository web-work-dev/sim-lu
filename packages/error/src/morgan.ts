import type { IncomingMessage, ServerResponse } from "node:http";

import type { Logger } from "winston";

import { createErrorLogger, type LoggerOptions } from "./logger.js";
import morgan from "morgan";

type Req = IncomingMessage;
type Res = ServerResponse;
type MorganFormatFn = morgan.FormatFn<Req, Res>;
type MorganOptions = morgan.Options<Req, Res>;
type MorganTokens = morgan.TokenIndexer<Req, Res>;
type MorganHandler = (req: Req, res: Res, callback: (err?: Error) => void) => void;

export interface MorganLogTargetConfig {
    readonly logger?: Logger;
    readonly loggerOptions?: LoggerOptions;
    readonly format?: MorganFormatFn;
    readonly morganOptions?: MorganOptions;
    readonly skip?: (url: string) => boolean;
}

function tokenStr(fn: MorganTokens[string] | undefined, req: Req, res: Res): string {
    return fn?.(req, res) ?? "";
}

function defaultFormat(
    logger: Logger,
): MorganFormatFn {
    return (tokens: MorganTokens, req: Req, res: Res) => {
        const status = Number(tokens.status?.(req, res) ?? 0) || 0;
        const level = status >= 500
            ? "error"
            : status >= 400
              ? "warn"
              : status >= 300
                ? "http"
                : "info";

        const method = tokenStr(tokens.method, req, res);
        const url = tokenStr(tokens.url, req, res);
        const message = `${method} ${url} ${status}`;

        void logger.log(level, message, {
            level,
            method,
            url,
            status,
            httpVersion: tokenStr(tokens["http-version"], req, res),
            remoteAddr: tokenStr(tokens["remote-addr"], req, res),
            userAgent: tokenStr(tokens["user-agent"], req, res),
            responseTime: tokenStr(tokens["response-time"], req, res),
        });

        return "";
    };
}

export function createMorganLogger(
    opts: MorganLogTargetConfig = {},
): MorganHandler {
    const logger = opts.logger ?? createErrorLogger(opts.loggerOptions ?? {});
    const format = opts.format ?? defaultFormat(logger);

    const morganOptions: MorganOptions = {
        ...(opts.skip
            ? { skip: (req: Req) => opts.skip!(req.url ?? "") }
            : {}),
        ...opts.morganOptions,
    };

    return morgan(format, morganOptions) as MorganHandler;
}

export {
    morgan,
    type MorganFormatFn,
    type MorganOptions,
    type MorganTokens,
};
