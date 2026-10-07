import type { HandlerRef } from "../execution/handler-ref.js";
export declare class GuardMetadata<T extends object = any> {
    private readonly globalGuards;
    constructor(globalGuards?: readonly Function[]);
    getControllerGuards(controller: T): readonly Function[];
    getHandlerGuards(handler: HandlerRef<T>): readonly Function[];
    getGuards(handler: HandlerRef<T>): readonly Function[];
}
//# sourceMappingURL=guard-metadata.d.ts.map