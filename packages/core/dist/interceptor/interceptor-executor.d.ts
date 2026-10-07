import type { ExecutionContext } from "../execution/execution-context.js";
import type { HandlerRef } from "../execution/handler-ref.js";
import { InterceptorMetadata } from "./interceptor-metadata.js";
import { InterceptorRegistry } from "./interceptor-registry.js";
export declare class InterceptorExecutor {
    private readonly metadata;
    private readonly registry;
    constructor(metadata: InterceptorMetadata, registry: InterceptorRegistry);
    execute<TController extends object>(handler: HandlerRef<TController>, context: ExecutionContext<TController>, next: () => unknown | Promise<unknown>): Promise<unknown>;
    private resolveInterceptor;
}
//# sourceMappingURL=interceptor-executor.d.ts.map