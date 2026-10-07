import { ParameterResolver, ParameterPipeExecutor, } from "../parameter/index.js";
export class ExecutionRunner {
    parameterResolver;
    parameterPipeExecutor;
    constructor(parameterResolver, parameterPipeExecutor) {
        this.parameterResolver = parameterResolver;
        this.parameterPipeExecutor = parameterPipeExecutor;
    }
    async execute(handler, context) {
        let args = this.parameterResolver.resolve(handler, context);
        const parameterPipes = this.parameterResolver.getParameterPipes(handler);
        args = await this.parameterPipeExecutor.execute(args, parameterPipes, context);
        return await handler.invoke(args);
    }
}
//# sourceMappingURL=execution-runner.js.map