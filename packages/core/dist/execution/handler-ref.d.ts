import type { RouteMetadata, WebSocketEventMetadata } from "@sim-lu/common";
import type { ControllerRef } from "../index.js";
export type HandlerMetadata = {
    type: "http";
    metadata: RouteMetadata;
} | {
    type: "websocket";
    metadata: WebSocketEventMetadata;
};
export declare class HandlerRef<TController extends object> {
    readonly controller: ControllerRef<TController>;
    readonly method: string | symbol;
    constructor(controller: ControllerRef<TController>, method: string | symbol);
    invoke(args?: readonly unknown[]): unknown;
}
//# sourceMappingURL=handler-ref.d.ts.map