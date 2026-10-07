import type { InjectToken } from "../container/token.js";
import type { ExecutionContext } from "../execution/execution-context.js";
import type { HandlerRef } from "../execution/handler-ref.js";
import { TransformerMetadata } from "./transformer-metadata.js";
import { TransformerRegistry } from "./transformer-registry.js";
import type { Transformer } from "./transformer.js";

export class TransformerExecutor {
    public constructor(
        private readonly metadata: TransformerMetadata,
        private readonly registry: TransformerRegistry,
    ) { }

    public async execute<TInput, TController extends object = object>(
        value: TInput,
        handler: HandlerRef<TController>,
        context: ExecutionContext<TController>,
    ): Promise<unknown> {
        const transformerTokens =
            this.metadata.getTransformers(handler);

        let currentValue: unknown = value;

        for (const token of transformerTokens) {
            const transformer =
                await this.resolveTransformer(token as any);

            currentValue =
                await transformer.transform(
                    currentValue,
                    context,
                );
        }

        return currentValue;
    }

    private async resolveTransformer(
        token: InjectToken,
    ): Promise<Transformer> {
        if (!this.registry.has(token)) {
            await this.registry.register(token as any);
        }

        return this.registry.get(token as any);
    }
}
