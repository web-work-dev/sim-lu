import type { HandlerRef } from "./handler-ref.js";
export type ExecutionTransport = "http" | "websocket";
export declare class ExecutionContext<TController extends object = object> {
    readonly handler: HandlerRef<TController>;
    readonly transport: ExecutionTransport;
    private readonly stateStore;
    constructor(handler: HandlerRef<TController>, transport: ExecutionTransport);
    set<T>(key: string, value: T): void;
    get<T>(key: string): T | undefined;
    has(key: string): boolean;
    delete(key: string): boolean;
    getState(): ReadonlyMap<string, unknown>;
}
//# sourceMappingURL=execution-context.d.ts.map