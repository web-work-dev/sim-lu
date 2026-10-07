import type { ExecutionContext } from "./execution-context.js";
export type ExecutionHandler<TController extends object> = (context: ExecutionContext<TController>) => unknown | Promise<unknown>;
export type ExecutionMiddleware<TController extends object> = (context: ExecutionContext<TController>, next: ExecutionHandler<TController>) => unknown | Promise<unknown>;
export declare class ExecutionPipeline {
    private readonly middleware;
    use(middleware: ExecutionMiddleware<object>): this;
    execute(context: ExecutionContext<object>, handler: ExecutionHandler<object>): Promise<unknown>;
}
//# sourceMappingURL=execution-pipeline.d.ts.map