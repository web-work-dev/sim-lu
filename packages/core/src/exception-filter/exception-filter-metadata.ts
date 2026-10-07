import {
    METADATA_KEYS,
} from "@sim-lu/common";

import type { HandlerRef } from "../execution/handler-ref.js";

export class ExceptionFilterMetadata<TController extends object = object> {
    public constructor(
        private readonly globalFilters: readonly Function[] = [],
    ) { }

    public getGlobalFilters(): readonly Function[] {
        return this.globalFilters;
    }

    public getControllerFilters(
        controller: TController,
    ): readonly Function[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                controller.constructor,
            ) ?? []
        );
    }

    public getHandlerFilters(
        handler: HandlerRef<TController>,
    ): readonly Function[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                handler.controller.instance,
                handler.method,
            ) ?? []
        );
    }

    public getCatchTypes(
        token: Function,
    ): readonly Function[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.CATCH,
                token,
            ) ?? []
        );
    }

    public getFilters(
        handler: HandlerRef<TController>,
    ): readonly Function[] {
        const controllerFilters =
            this.getControllerFilters(
                handler.controller.instance,
            );

        const handlerFilters =
            this.getHandlerFilters(handler);

        return [
            ...this.globalFilters,
            ...controllerFilters,
            ...handlerFilters,
        ];
    }
}
