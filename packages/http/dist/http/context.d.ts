export type ExecutionType = "http" | "websocket";
export interface ExecutionContext<TRequest = unknown, TResponse = unknown> {
    readonly type: ExecutionType;
    readonly request: TRequest;
    readonly response: TResponse;
    readonly controller: Function;
    readonly handler: string | symbol;
    readonly state: Map<string, unknown>;
}
//# sourceMappingURL=context.d.ts.map