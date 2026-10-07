import type { HandlerRef } from "./handler-ref.js";
import type { ExecutionContext } from "./execution-context.js";
import { GuardExecutor } from "../guard/guard-executor.js";
import { InterceptorExecutor } from "../interceptor/interceptor-executor.js";
import { ExceptionFilterExecutor } from "../exception-filter/exception-filter-executor.js";
import { TransformerExecutor } from "../transform/transformer-executor.js";
import { ExecutionRunner } from "./execution-runner.js";
import { PipeExecutor } from "../pipe/pipe-executor.js";
export declare class ExecutionEngine {
    private readonly transformerExecutor;
    private readonly exceptionFilterExecutor;
    private readonly interceptorExecutor;
    private readonly guardExecutor;
    private readonly executionRunner;
    private readonly pipeExecutor?;
    constructor(transformerExecutor: TransformerExecutor, exceptionFilterExecutor: ExceptionFilterExecutor, interceptorExecutor: InterceptorExecutor, guardExecutor: GuardExecutor, executionRunner: ExecutionRunner, pipeExecutor?: PipeExecutor | undefined);
    execute<TController extends object>(handler: HandlerRef<TController>, context: ExecutionContext<TController>): Promise<unknown>;
}
//# sourceMappingURL=execution-engine.d.ts.map