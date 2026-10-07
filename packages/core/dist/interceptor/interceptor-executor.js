import { InterceptorMetadata } from "./interceptor-metadata.js";
import { InterceptorRegistry } from "./interceptor-registry.js";
export class InterceptorExecutor {
    metadata;
    registry;
    constructor(metadata, registry) {
        this.metadata = metadata;
        this.registry = registry;
    }
    async execute(handler, context, next) {
        const interceptorTokens = this.metadata.getInterceptors(handler);
        const invoke = async (index) => {
            const token = interceptorTokens[index];
            if (token === undefined) {
                return next();
            }
            const interceptor = await this.resolveInterceptor(token);
            return interceptor.intercept(context, () => invoke(index + 1));
        };
        return await invoke(0);
    }
    async resolveInterceptor(token) {
        if (!this.registry.has(token)) {
            await this.registry.register(token);
        }
        return this.registry.get(token);
    }
}
//# sourceMappingURL=interceptor-executor.js.map