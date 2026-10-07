import type { InjectToken } from "../container/token.js";
import type { ExecutionContext } from "../execution/execution-context.js";
import type { HandlerRef } from "../execution/handler-ref.js";
import { InterceptorMetadata } from "./interceptor-metadata.js";
import { InterceptorRegistry } from "./interceptor-registry.js";
import type { Interceptor } from "./interceptor.js";

export class InterceptorExecutor {
    public constructor(
        private readonly metadata: InterceptorMetadata,
        private readonly registry: InterceptorRegistry,
    ) { }

    public async execute<TController extends object>(
        handler: HandlerRef<TController>,
        context: ExecutionContext<TController>,
        next: () => unknown | Promise<unknown>,
    ): Promise<unknown> {
        const interceptorTokens =
            this.metadata.getInterceptors(handler);

        const invoke = async (index: number): Promise<unknown> => {
            const token = interceptorTokens[index];

            if (token === undefined) {
                return next();
            }

            const interceptor =
                await this.resolveInterceptor<Interceptor<TController>>(token as any);

            return interceptor.intercept(
                context,
                () => invoke(index + 1),
            );
        };

        return await invoke(0);
    }

    private async resolveInterceptor<T extends Interceptor>(
        token: InjectToken<T>,
    ): Promise<T> {
        if (!this.registry.has(token)) {
            await this.registry.register(token);
        }

        return this.registry.get(token);
    }
}
