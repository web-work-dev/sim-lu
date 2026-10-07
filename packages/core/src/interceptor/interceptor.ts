import type { ExecutionContext } from "../execution/execution-context.js";

export interface Interceptor<TController extends object = object> {
    intercept(
        context: ExecutionContext<TController>,
        next: () => unknown | Promise<unknown>,
    ): unknown | Promise<unknown>;
}
