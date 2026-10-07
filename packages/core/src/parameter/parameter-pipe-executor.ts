import type { InjectToken } from "../container/token.js";
import type { ExecutionContext } from "../execution/execution-context.js";
import type { HandlerRef } from "../execution/handler-ref.js";
import type { Pipe } from "../pipe/pipe.js";
import { PipeRegistry } from "../pipe/pipe-registry.js";

export interface ParameterPipeMetadata {
    readonly index: number;
    readonly pipe: InjectToken;
}

export class ParameterPipeExecutor {
    public constructor(
        private readonly registry: PipeRegistry,
    ) { }

    public async execute<TController extends object = object>(
        args: readonly unknown[],
        pipes: readonly ParameterPipeMetadata[],
        context: ExecutionContext<TController>,
    ): Promise<unknown[]> {
        const result = [...args];

        for (const metadata of pipes) {
            const pipe = await this.resolvePipe(metadata.pipe);

            result[metadata.index] =
                await pipe.transform(
                    result[metadata.index],
                    context,
                );
        }

        return result;
    }

    private async resolvePipe(
        token: InjectToken,
    ): Promise<Pipe> {
        if (!this.registry.has(token as any)) {
            await this.registry.register(token as any);
        }

        return this.registry.get(token as any);
    }
}