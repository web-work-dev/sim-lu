import { TransformerMetadata } from "./transformer-metadata.js";
import { TransformerRegistry } from "./transformer-registry.js";
export class TransformerExecutor {
    metadata;
    registry;
    constructor(metadata, registry) {
        this.metadata = metadata;
        this.registry = registry;
    }
    async execute(value, handler, context) {
        const transformerTokens = this.metadata.getTransformers(handler);
        let currentValue = value;
        for (const token of transformerTokens) {
            const transformer = await this.resolveTransformer(token);
            currentValue =
                await transformer.transform(currentValue, context);
        }
        return currentValue;
    }
    async resolveTransformer(token) {
        if (!this.registry.has(token)) {
            await this.registry.register(token);
        }
        return this.registry.get(token);
    }
}
//# sourceMappingURL=transformer-executor.js.map