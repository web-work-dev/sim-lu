import type { IncomingMessage, ServerResponse } from "node:http";
import { NodeHttpKernel, type ListenOptions } from "@sim-lu/core";
import { type ErrorHandlerOptions } from "@sim-lu/error";
import { type Express } from "express";
export interface ExpressAdapterOptions {
    readonly error?: ErrorHandlerOptions;
}
export declare class ExpressAdapter extends NodeHttpKernel {
    readonly name = "express";
    private expressApp;
    private routesBound;
    constructor(options?: ExpressAdapterOptions);
    getInstance(): Express;
    listen(options: ListenOptions): Promise<void>;
    handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void>;
    private bindExpressRoutes;
    private toExpressPath;
    private toHttpRequest;
    private normalizeDict;
    private writeExpress;
    private writeSerialized;
}
//# sourceMappingURL=express-adapter.d.ts.map