import type { ExecutionContext } from "../execution/execution-context.js";
import type { HandlerRef } from "../execution/handler-ref.js";
import { TransformerMetadata } from "./transformer-metadata.js";
import { TransformerRegistry } from "./transformer-registry.js";
export declare class TransformerExecutor {
    private readonly metadata;
    private readonly registry;
    constructor(metadata: TransformerMetadata, registry: TransformerRegistry);
    execute<TInput, TController extends object = object>(value: TInput, handler: HandlerRef<TController>, context: ExecutionContext<TController>): Promise<unknown>;
    private resolveTransformer;
}
//# sourceMappingURL=transformer-executor.d.ts.map