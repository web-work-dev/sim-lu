import type { HandlerRef } from "./handler-ref.js";
import type { ExecutionContext } from "./execution-context.js";
import { ExecutionPipeline } from "./execution-pipeline.js";
import { ExecutionEngine } from "./execution-engine.js";
export declare class ExecutionDispatcher {
    private readonly pipeline;
    private readonly engine;
    constructor(pipeline: ExecutionPipeline, engine: ExecutionEngine);
    execute<TController extends object>(handler: HandlerRef<TController>, context: ExecutionContext<TController>): Promise<unknown>;
}
//# sourceMappingURL=execution-dispatcher.d.ts.map