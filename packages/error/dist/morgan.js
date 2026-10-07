import { createErrorLogger } from "./logger.js";
import morgan from "morgan";
function tokenStr(fn, req, res) {
    return fn?.(req, res) ?? "";
}
function defaultFormat(logger) {
    return (tokens, req, res) => {
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
export function createMorganLogger(opts = {}) {
    const logger = opts.logger ?? createErrorLogger(opts.loggerOptions ?? {});
    const format = opts.format ?? defaultFormat(logger);
    const morganOptions = {
        ...(opts.skip
            ? { skip: (req) => opts.skip(req.url ?? "") }
            : {}),
        ...opts.morganOptions,
    };
    return morgan(format, morganOptions);
}
export { morgan, };
//# sourceMappingURL=morgan.js.map