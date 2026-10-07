import {
    METADATA_KEYS,
} from "@sim-lu/common";

import type { HandlerRef } from "../execution/handler-ref.js";

export class InterceptorMetadata<TController extends object = object> {
    public constructor(
        private readonly globalInterceptors: readonly Function[] = [],
    ) { }

    public getControllerInterceptors(
        controller: TController,
    ): readonly Function[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.INTERCEPTOR,
                controller.constructor,
            ) ?? []
        );
    }

    public getHandlerInterceptors(
        handler: HandlerRef<TController>,
    ): readonly Function[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.INTERCEPTOR,
                handler.controller.instance,
                handler.method,
            ) ?? []
        );
    }

    public getInterceptors(
        handler: HandlerRef<TController>,
    ): readonly Function[] {
        const controllerInterceptors =
            this.getControllerInterceptors(
                handler.controller.instance,
            );

        const handlerInterceptors =
            this.getHandlerInterceptors(handler);

        return [
            ...this.globalInterceptors,
            ...controllerInterceptors,
            ...handlerInterceptors,
        ];
    }
}
