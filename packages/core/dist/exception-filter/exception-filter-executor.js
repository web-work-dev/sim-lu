import { ExceptionFilterMetadata } from "./exception-filter-metadata.js";
import { ExceptionFilterRegistry } from "./exception-filter-registry.js";
export class ExceptionFilterExecutor {
    metadata;
    registry;
    fallback;
    constructor(metadata, registry, fallback) {
        this.metadata = metadata;
        this.registry = registry;
        this.fallback = fallback;
    }
    async execute(exception, handler, context) {
        const filterTokens = this.metadata.getFilters(handler);
        for (let index = filterTokens.length - 1; index >= 0; index--) {
            const token = filterTokens[index];
            if (token === undefined) {
                continue;
            }
            if (!this.matches(token, exception)) {
                continue;
            }
            const filter = await this.resolveFilter(token);
            return await filter.catch(exception, context);
        }
        if (this.fallback) {
            return await this.fallback.catch(exception, context);
        }
        throw exception;
    }
    matches(token, exception) {
        const types = this.metadata.getCatchTypes(token);
        if (types.length === 0) {
            return true;
        }
        return types.some((type) => exception instanceof type);
    }
    async resolveFilter(token) {
        if (!this.registry.has(token)) {
            await this.registry.register(token);
        }
        return this.registry.get(token);
    }
}
//# sourceMappingURL=exception-filter-executor.js.map