import type { ExecutionContext } from "../execution/execution-context.js";
export declare class GuardContext<TController extends object = object> {
    readonly execution: ExecutionContext<TController>;
    constructor(execution: ExecutionContext<TController>);
    get handler(): import("../index.js").HandlerRef<TController>;
    get transport(): import("../execution/execution-context.js").ExecutionTransport;
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T): void;
    getState(): ReadonlyMap<string, unknown>;
}
//# sourceMappingURL=guard-context.d.ts.map