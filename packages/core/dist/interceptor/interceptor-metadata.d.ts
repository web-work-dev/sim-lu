import type { HandlerRef } from "../execution/handler-ref.js";
export declare class InterceptorMetadata<TController extends object = object> {
    private readonly globalInterceptors;
    constructor(globalInterceptors?: readonly Function[]);
    getControllerInterceptors(controller: TController): readonly Function[];
    getHandlerInterceptors(handler: HandlerRef<TController>): readonly Function[];
    getInterceptors(handler: HandlerRef<TController>): readonly Function[];
}
//# sourceMappingURL=interceptor-metadata.d.ts.map