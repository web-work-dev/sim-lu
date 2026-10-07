import type { HandlerRef } from "../execution/handler-ref.js";
export declare class ExceptionFilterMetadata<TController extends object = object> {
    private readonly globalFilters;
    constructor(globalFilters?: readonly Function[]);
    getGlobalFilters(): readonly Function[];
    getControllerFilters(controller: TController): readonly Function[];
    getHandlerFilters(handler: HandlerRef<TController>): readonly Function[];
    getCatchTypes(token: Function): readonly Function[];
    getFilters(handler: HandlerRef<TController>): readonly Function[];
}
//# sourceMappingURL=exception-filter-metadata.d.ts.map