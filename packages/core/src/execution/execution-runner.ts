import type { HandlerRef } from "./handler-ref.js";
import type { ExecutionContext } from "./execution-context.js";
import {
    ParameterResolver,
    ParameterPipeExecutor,
} from "../parameter/index.js";

export class ExecutionRunner {
    constructor(
        private readonly parameterResolver: ParameterResolver,
        private readonly parameterPipeExecutor: ParameterPipeExecutor,
    ) { }

    async execute<TController extends object>(
        handler: HandlerRef<TController>,
        context: ExecutionContext<TController>,
    ): Promise<unknown> {
        let args = this.parameterResolver.resolve(handler, context);

        const parameterPipes =
            this.parameterResolver.getParameterPipes(handler);

        args = await this.parameterPipeExecutor.execute(
            args,
            parameterPipes,
            context,
        );

        return await handler.invoke(args);
    }
}