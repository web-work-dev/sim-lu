import type { ExecutionContext } from "../execution/execution-context.js";

export interface ExceptionFilter<TController extends object = object> {
    catch(
        exception: unknown,
        context: ExecutionContext<TController>,
    ): unknown | Promise<unknown>;
}
