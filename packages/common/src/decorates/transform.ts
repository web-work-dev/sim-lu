import { METADATA_KEYS } from "../metadata/keys.js";

/**
 * Registers transformers that transform the handler return value.
 *
 * Can be applied at the class level or the method level.
 *
 * @param transformers - Transformer classes to apply.
 */
export function UseTransformers(
    ...transformers: readonly Function[]
): ClassDecorator & MethodDecorator {
    return (
        target: object | Function,
        propertyKey?: string | symbol,
    ): void => {
        if (propertyKey !== undefined) {
            const existing =
                Reflect.getMetadata(
                    METADATA_KEYS.TRANSFORM,
                    target,
                    propertyKey,
                ) as Function[] | undefined;

            Reflect.defineMetadata(
                METADATA_KEYS.TRANSFORM,
                [...(existing ?? []), ...transformers],
                target,
                propertyKey,
            );

            return;
        }

        const existing =
            Reflect.getMetadata(
                METADATA_KEYS.TRANSFORM,
                target,
            ) as Function[] | undefined;

        Reflect.defineMetadata(
            METADATA_KEYS.TRANSFORM,
            [...(existing ?? []), ...transformers],
            target,
        );
    };
}
