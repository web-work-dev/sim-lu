import type { HandlerRef } from "./handler-ref.js";
import type { ExecutionContext } from "./execution-context.js";
import { ExecutionPipeline } from "./execution-pipeline.js";
import { ExecutionEngine } from "./execution-engine.js";

export class ExecutionDispatcher {
    constructor(
        private readonly pipeline: ExecutionPipeline,
        private readonly engine: ExecutionEngine,
    ) { }

    async execute<TController extends object>(
        handler: HandlerRef<TController>,
        context: ExecutionContext<TController>,
    ): Promise<unknown> {
        return this.pipeline.execute(
            context,
            (executionContext) =>
                this.engine.execute(handler, executionContext),
        );
    }
}