import type { ExecutionContext } from "../execution/execution-context.js";
export declare class InterceptorContext<TController extends object = object> {
    private readonly executionContext;
    constructor(executionContext: ExecutionContext<TController>);
    get handler(): import("../index.js").HandlerRef<TController>;
    get transport(): import("../execution/execution-context.js").ExecutionTransport;
    set<T>(key: string, value: T): void;
    get<T>(key: string): T | undefined;
    has(key: string): boolean;
    delete(key: string): boolean;
    getState(): ReadonlyMap<string, unknown>;
}
//# sourceMappingURL=interceptor-context.d.ts.map