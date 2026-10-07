import type { IncomingMessage, ServerResponse } from "node:http";
import type { Logger } from "winston";
import { type LoggerOptions } from "./logger.js";
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
export declare function createMorganLogger(opts?: MorganLogTargetConfig): MorganHandler;
export { morgan, type MorganFormatFn, type MorganOptions, type MorganTokens, };
//# sourceMappingURL=morgan.d.ts.map