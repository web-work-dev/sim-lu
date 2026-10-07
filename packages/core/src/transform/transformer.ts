import type { ExecutionContext } from "../execution/execution-context.js";

export interface Transformer<
    TInput = unknown,
    TOutput = TInput,
    TController extends object = object,
> {
    transform(
        value: TInput,
        context: ExecutionContext<TController>,
    ): TOutput | Promise<TOutput>;
}
