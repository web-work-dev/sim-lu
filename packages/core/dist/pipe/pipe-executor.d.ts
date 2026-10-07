import type { HandlerRef } from "../execution/handler-ref.js";
import { PipeContext } from "./pipe-context.js";
import { PipeMetadata } from "./pipe-metadata.js";
import { PipeRegistry } from "./pipe-registry.js";
export declare class PipeExecutor {
    private readonly metadata;
    private readonly registry;
    constructor(metadata: PipeMetadata, registry: PipeRegistry);
    execute<TInput, TController extends object = object>(value: TInput, handler: HandlerRef<TController>, context: PipeContext<TController>): Promise<unknown>;
    private resolvePipe;
}
//# sourceMappingURL=pipe-executor.d.ts.map