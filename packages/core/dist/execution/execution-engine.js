import { GuardExecutor } from "../guard/guard-executor.js";
import { GuardContext } from "../guard/guard-context.js";
import { InterceptorExecutor } from "../interceptor/interceptor-executor.js";
import { ExceptionFilterExecutor } from "../exception-filter/exception-filter-executor.js";
import { TransformerExecutor } from "../transform/transformer-executor.js";
import { ExecutionRunner } from "./execution-runner.js";
import { PipeExecutor } from "../pipe/pipe-executor.js";
import { PipeContext } from "../pipe/pipe-context.js";
import { isSerializedBody } from "@sim-lu/error";
export class ExecutionEngine {
    transformerExecutor;
    exceptionFilterExecutor;
    interceptorExecutor;
    guardExecutor;
    executionRunner;
    pipeExecutor;
    constructor(transformerExecutor, exceptionFilterExecutor, interceptorExecutor, guardExecutor, executionRunner, pipeExecutor) {
        this.transformerExecutor = transformerExecutor;
        this.exceptionFilterExecutor = exceptionFilterExecutor;
        this.interceptorExecutor = interceptorExecutor;
        this.guardExecutor = guardExecutor;
        this.executionRunner = executionRunner;
        this.pipeExecutor = pipeExecutor;
    }
    async execute(handler, context) {
        let result;
        try {
            result = await this.interceptorExecutor.execute(handler, context, async () => {
                const guardContext = new GuardContext(context);
                await this.guardExecutor.execute(handler, guardContext);
                return await this.executionRunner.execute(handler, context);
            });
        }
        catch (exception) {
            result = await this.exceptionFilterExecutor.execute(exception, handler, context);
        }
        if (isSerializedBody(result)) {
            return result;
        }
        if (this.pipeExecutor) {
            result = await this.pipeExecutor.execute(result, handler, new PipeContext(context));
        }
        return await this.transformerExecutor.execute(result, handler, context);
    }
}
//# sourceMappingURL=execution-engine.js.map