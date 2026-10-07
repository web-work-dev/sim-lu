import type { ExecutionContext } from "./execution-context.js";

export type ExecutionHandler<TController extends object> = (
    context: ExecutionContext<TController>,
) => unknown | Promise<unknown>;

export type ExecutionMiddleware<TController extends object> = (
    context: ExecutionContext<TController>,
    next: ExecutionHandler<TController>,
) => unknown | Promise<unknown>;

export class ExecutionPipeline {
    private readonly middleware: ExecutionMiddleware<object>[] = [];

    public use(
        middleware: ExecutionMiddleware<object>,
    ): this {
        this.middleware.push(middleware);
        return this;
    }

    public async execute(
        context: ExecutionContext<object>,
        handler: ExecutionHandler<object>,
    ): Promise<unknown> {
        const chain = this.middleware.reduceRight<ExecutionHandler<object>>(
            (next, middleware) => {
                return (currentContext) =>
                    middleware(currentContext, next);
            },
            handler,
        );

        return chain(context);
    }
}