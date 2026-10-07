import {
    METADATA_KEYS,
} from "@sim-lu/common";

import type { HandlerRef } from "../execution/handler-ref.js";

export class GuardMetadata<T extends object = any> {
    public constructor(
        private readonly globalGuards: readonly Function[] = [],
    ) { }

    public getControllerGuards(
        controller: T,
    ): readonly Function[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.GUARD,
                controller.constructor,
            ) ?? []
        );
    }

    public getHandlerGuards(
        handler: HandlerRef<T>,
    ): readonly Function[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.GUARD,
                handler.controller.instance,
                handler.method,
            ) ?? []
        );
    }

    public getGuards(
        handler: HandlerRef<T>,
    ): readonly Function[] {
        const controllerGuards =
            this.getControllerGuards(
                handler.controller.instance,
            );

        const handlerGuards =
            this.getHandlerGuards(handler);

        return [
            ...this.globalGuards,
            ...controllerGuards,
            ...handlerGuards,
        ];
    }
}