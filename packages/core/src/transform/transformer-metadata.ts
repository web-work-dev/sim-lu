import {
    METADATA_KEYS,
} from "@sim-lu/common";

import type { HandlerRef } from "../execution/handler-ref.js";

export class TransformerMetadata<TController extends object = object> {
    public constructor(
        private readonly globalTransformers: readonly Function[] = [],
    ) { }

    public getControllerTransformers(
        controller: TController,
    ): readonly Function[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.TRANSFORM,
                controller.constructor,
            ) ?? []
        );
    }

    public getHandlerTransformers(
        handler: HandlerRef<TController>,
    ): readonly Function[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.TRANSFORM,
                handler.controller.instance,
                handler.method,
            ) ?? []
        );
    }

    public getTransformers(
        handler: HandlerRef<TController>,
    ): readonly Function[] {
        const controllerTransformers =
            this.getControllerTransformers(
                handler.controller.instance,
            );

        const handlerTransformers =
            this.getHandlerTransformers(handler);

        return [
            ...this.globalTransformers,
            ...controllerTransformers,
            ...handlerTransformers,
        ];
    }
}
