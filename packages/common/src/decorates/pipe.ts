import { METADATA_KEYS } from "../metadata/keys.js";

/**
 * Registers pipes that transform handler input parameters.
 *
 * Can be applied at the class level or the method level.
 *
 * @param pipes - Pipe classes to apply.
 */
export function UsePipes(
    ...pipes: readonly Function[]
): ClassDecorator & MethodDecorator {
    return (
        target: object | Function,
        propertyKey?: string | symbol,
    ): void => {
        if (propertyKey !== undefined) {
            const existing =
                Reflect.getMetadata(
                    METADATA_KEYS.PIPE,
                    target,
                    propertyKey,
                ) as Function[] | undefined;

            Reflect.defineMetadata(
                METADATA_KEYS.PIPE,
                [...(existing ?? []), ...pipes],
                target,
                propertyKey,
            );

            return;
        }

        const existing =
            Reflect.getMetadata(
                METADATA_KEYS.PIPE,
                target,
            ) as Function[] | undefined;

        Reflect.defineMetadata(
            METADATA_KEYS.PIPE,
            [...(existing ?? []), ...pipes],
            target,
        );
    };
}
