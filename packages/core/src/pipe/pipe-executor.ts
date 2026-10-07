import type { InjectToken } from "../container/token.js";
import type { HandlerRef } from "../execution/handler-ref.js";
import { PipeContext } from "./pipe-context.js";
import { PipeMetadata } from "./pipe-metadata.js";
import { PipeRegistry } from "./pipe-registry.js";
import type { Pipe } from "./pipe.js";

export class PipeExecutor {
    public constructor(
        private readonly metadata: PipeMetadata,
        private readonly registry: PipeRegistry,
    ) { }

    public async execute<TInput, TController extends object = object>(
        value: TInput,
        handler: HandlerRef<TController>,
        context: PipeContext<TController>,
    ): Promise<unknown> {
        const pipeTokens =
            this.metadata.getPipes(handler);

        let currentValue: unknown = value;

        for (const token of pipeTokens) {
            const pipe =
                await this.resolvePipe(token as any);

            currentValue =
                await pipe.transform(
                    currentValue,
                    context.execution,
                );
        }

        return currentValue;
    }

    private async resolvePipe(
        token: InjectToken,
    ): Promise<Pipe> {
        if (!this.registry.has(token)) {
            await this.registry.register(token as any);
        }

        return this.registry.get(token as any);
    }
}