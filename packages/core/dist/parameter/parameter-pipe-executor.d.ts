import type { InjectToken } from "../container/token.js";
import type { ExecutionContext } from "../execution/execution-context.js";
import { PipeRegistry } from "../pipe/pipe-registry.js";
export interface ParameterPipeMetadata {
    readonly index: number;
    readonly pipe: InjectToken;
}
export declare class ParameterPipeExecutor {
    private readonly registry;
    constructor(registry: PipeRegistry);
    execute<TController extends object = object>(args: readonly unknown[], pipes: readonly ParameterPipeMetadata[], context: ExecutionContext<TController>): Promise<unknown[]>;
    private resolvePipe;
}
//# sourceMappingURL=parameter-pipe-executor.d.ts.map