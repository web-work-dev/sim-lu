import type { ExecutionContext } from "../execution/index.js";

export interface Pipe<
    TInput = unknown,
    TOutput = TInput,
    TController extends object = object,
> {
    transform(
        value: TInput,
        context: ExecutionContext<TController>,
    ): TOutput | Promise<TOutput>;
}