import type { HandlerRef } from "../execution/handler-ref.js";
import type { ExecutionContext } from "../execution/execution-context.js";
import type { ParameterPipeMetadata } from "./parameter-pipe-executor.js";
import { ParameterMetadataResolver } from "./parameter-metadata.js";
export declare class ParameterResolver<TController extends object = object> {
    private readonly metadata;
    constructor(metadata: ParameterMetadataResolver<TController>);
    resolve(handler: HandlerRef<TController>, context: ExecutionContext): unknown[];
    getParameterPipes(handler: HandlerRef<TController>): readonly ParameterPipeMetadata[];
    private resolveParameter;
    private resolveNamedValue;
}
//# sourceMappingURL=parameter-resolver.d.ts.map