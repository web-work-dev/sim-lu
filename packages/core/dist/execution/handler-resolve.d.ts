import type { ControllerRef } from "../index.js";
import { HandlerRef } from "./handler-ref.js";
export declare class HandlerResolver {
    resolveHttpHandlers<TController extends object>(controller: ControllerRef<TController>): readonly HandlerRef<TController>[];
    resolveWebSocketHandlers<TController extends object>(controller: ControllerRef<TController>): readonly HandlerRef<TController>[];
}
//# sourceMappingURL=handler-resolve.d.ts.map