import type { InjectToken } from "../container/token.js";
import type { ExecutionContext } from "../execution/execution-context.js";
import type { HandlerRef } from "../execution/handler-ref.js";
import { ExceptionFilterMetadata } from "./exception-filter-metadata.js";
import { ExceptionFilterRegistry } from "./exception-filter-registry.js";
import type { ExceptionFilter } from "./exception-filter.js";

export class ExceptionFilterExecutor {
    public constructor(
        private readonly metadata: ExceptionFilterMetadata,
        private readonly registry: ExceptionFilterRegistry,
        private readonly fallback?: ExceptionFilter,
    ) { }

    public async execute<TController extends object>(
        exception: unknown,
        handler: HandlerRef<TController>,
        context: ExecutionContext<TController>,
    ): Promise<unknown> {
        const filterTokens =
            this.metadata.getFilters(handler);

        for (let index = filterTokens.length - 1; index >= 0; index--) {
            const token = filterTokens[index];

            if (token === undefined) {
                continue;
            }

            if (!this.matches(token, exception)) {
                continue;
            }

            const filter =
                await this.resolveFilter<ExceptionFilter<TController>>(token as any);

            return await filter.catch(exception, context);
        }

        if (this.fallback) {
            return await this.fallback.catch(exception, context);
        }

        throw exception;
    }

    private matches(
        token: Function,
        exception: unknown,
    ): boolean {
        const types = this.metadata.getCatchTypes(token);

        if (types.length === 0) {
            return true;
        }

        return types.some((type) => exception instanceof type);
    }

    private async resolveFilter<T extends ExceptionFilter>(
        token: InjectToken<T>,
    ): Promise<T> {
        if (!this.registry.has(token)) {
            await this.registry.register(token);
        }

        return this.registry.get(token);
    }
}
