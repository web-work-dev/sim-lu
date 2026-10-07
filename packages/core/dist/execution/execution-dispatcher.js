import { ExecutionPipeline } from "./execution-pipeline.js";
import { ExecutionEngine } from "./execution-engine.js";
export class ExecutionDispatcher {
    pipeline;
    engine;
    constructor(pipeline, engine) {
        this.pipeline = pipeline;
        this.engine = engine;
    }
    async execute(handler, context) {
        return this.pipeline.execute(context, (executionContext) => this.engine.execute(handler, executionContext));
    }
}
//# sourceMappingURL=execution-dispatcher.js.map