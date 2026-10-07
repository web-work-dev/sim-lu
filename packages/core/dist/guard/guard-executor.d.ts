import type { HandlerRef } from "../execution/handler-ref.js";
import { GuardContext } from "./guard-context.js";
import { GuardMetadata } from "./guard-metadata.js";
import { GuardRegistry } from "./guard-registry.js";
export declare class GuardExecutor {
    private readonly metadata;
    private readonly registry;
    constructor(metadata: GuardMetadata, registry: GuardRegistry);
    execute<TController extends object>(handler: HandlerRef<TController>, context: GuardContext<TController>): Promise<boolean>;
    private resolveGuard;
}
//# sourceMappingURL=guard-executor.d.ts.map