import {
    METADATA_KEYS,
} from "@sim-lu/common";

import type { HandlerRef } from "../execution/handler-ref.js";

export class PipeMetadata<TController extends object = object> {
    public getControllerPipes(
        controller: TController,
    ): readonly Function[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.PIPE,
                controller.constructor,
            ) ?? []
        );
    }

    public getHandlerPipes(
        handler: HandlerRef<TController>,
    ): readonly Function[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.PIPE,
                handler.controller.instance,
                handler.method,
            ) ?? []
        );
    }

    public getPipes(
        handler: HandlerRef<TController>,
    ): readonly Function[] {
        const controllerPipes =
            this.getControllerPipes(
                handler.controller.instance,
            );

        const handlerPipes =
            this.getHandlerPipes(handler);

        return [
            ...controllerPipes,
            ...handlerPipes,
        ];
    }
}