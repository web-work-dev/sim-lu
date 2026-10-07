import type { HandlerRef } from "../execution/handler-ref.js";
export declare class PipeMetadata<TController extends object = object> {
    getControllerPipes(controller: TController): readonly Function[];
    getHandlerPipes(handler: HandlerRef<TController>): readonly Function[];
    getPipes(handler: HandlerRef<TController>): readonly Function[];
}
//# sourceMappingURL=pipe-metadata.d.ts.map