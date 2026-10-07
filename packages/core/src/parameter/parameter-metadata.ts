import {
    METADATA_KEYS,
    type ParameterMetadata,
} from "@sim-lu/common";

import type { HandlerRef } from "../execution/handler-ref.js";

export class ParameterMetadataResolver<TController extends object = object> {
    public getParameters(
        handler: HandlerRef<TController>,
    ): readonly ParameterMetadata[] {
        const allParameters: ParameterMetadata[] =
            Reflect.getMetadata(
                METADATA_KEYS.PARAM,
                handler.controller.instance.constructor,
            ) ?? [];

        return allParameters.filter(
            (parameter) => parameter.handler === handler.method,
        );
    }

    public getPipes(
        handler: HandlerRef<TController>,
    ): readonly {
        index: number;
        pipe: Function;
    }[] {
        return (
            Reflect.getMetadata(
                METADATA_KEYS.PARAMETER_PIPES,
                handler.controller.instance,
                handler.method,
            ) ?? []
        );
    }
}