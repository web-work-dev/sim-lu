import type { HandlerRef } from "../execution/handler-ref.js";
export declare class TransformerMetadata<TController extends object = object> {
    private readonly globalTransformers;
    constructor(globalTransformers?: readonly Function[]);
    getControllerTransformers(controller: TController): readonly Function[];
    getHandlerTransformers(handler: HandlerRef<TController>): readonly Function[];
    getTransformers(handler: HandlerRef<TController>): readonly Function[];
}
//# sourceMappingURL=transformer-metadata.d.ts.map