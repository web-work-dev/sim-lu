import type { ExecutionContext } from "../execution/execution-context.js";
import type { HandlerRef } from "../execution/handler-ref.js";
import { ExceptionFilterMetadata } from "./exception-filter-metadata.js";
import { ExceptionFilterRegistry } from "./exception-filter-registry.js";
import type { ExceptionFilter } from "./exception-filter.js";
export declare class ExceptionFilterExecutor {
    private readonly metadata;
    private readonly registry;
    private readonly fallback?;
    constructor(metadata: ExceptionFilterMetadata, registry: ExceptionFilterRegistry, fallback?: ExceptionFilter | undefined);
    execute<TController extends object>(exception: unknown, handler: HandlerRef<TController>, context: ExecutionContext<TController>): Promise<unknown>;
    private matches;
    private resolveFilter;
}
//# sourceMappingURL=exception-filter-executor.d.ts.map