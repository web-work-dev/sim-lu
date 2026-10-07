import type { HandlerRef } from "./handler-ref.js";
import type { ExecutionContext } from "./execution-context.js";
import { ParameterResolver, ParameterPipeExecutor } from "../parameter/index.js";
export declare class ExecutionRunner {
    private readonly parameterResolver;
    private readonly parameterPipeExecutor;
    constructor(parameterResolver: ParameterResolver, parameterPipeExecutor: ParameterPipeExecutor);
    execute<TController extends object>(handler: HandlerRef<TController>, context: ExecutionContext<TController>): Promise<unknown>;
}
//# sourceMappingURL=execution-runner.d.ts.map