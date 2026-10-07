import type { ExecutionContext } from "../execution/execution-context.js";
export declare class ExceptionFilterContext<TController extends object = object> {
    private readonly executionContext;
    readonly exception: unknown;
    constructor(executionContext: ExecutionContext<TController>, exception: unknown);
    get handler(): import("../index.js").HandlerRef<TController>;
    get transport(): import("../execution/execution-context.js").ExecutionTransport;
    set<T>(key: string, value: T): void;
    get<T>(key: string): T | undefined;
    has(key: string): boolean;
    delete(key: string): boolean;
    getState(): ReadonlyMap<string, unknown>;
}
//# sourceMappingURL=exception-filter-context.d.ts.map