import type { ExecutionContext } from "../execution/execution-context.js";
export declare class TransformerContext<TController extends object = object> {
    readonly execution: ExecutionContext<TController>;
    constructor(execution: ExecutionContext<TController>);
    get handler(): import("../index.js").HandlerRef<TController>;
    get transport(): import("../execution/execution-context.js").ExecutionTransport;
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    getState(): ReadonlyMap<string, unknown>;
}
//# sourceMappingURL=transformer-context.d.ts.map