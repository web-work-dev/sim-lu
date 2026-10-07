import { PipeContext } from "./pipe-context.js";
import { PipeMetadata } from "./pipe-metadata.js";
import { PipeRegistry } from "./pipe-registry.js";
export class PipeExecutor {
    metadata;
    registry;
    constructor(metadata, registry) {
        this.metadata = metadata;
        this.registry = registry;
    }
    async execute(value, handler, context) {
        const pipeTokens = this.metadata.getPipes(handler);
        let currentValue = value;
        for (const token of pipeTokens) {
            const pipe = await this.resolvePipe(token);
            currentValue =
                await pipe.transform(currentValue, context.execution);
        }
        return currentValue;
    }
    async resolvePipe(token) {
        if (!this.registry.has(token)) {
            await this.registry.register(token);
        }
        return this.registry.get(token);
    }
}
//# sourceMappingURL=pipe-executor.js.map