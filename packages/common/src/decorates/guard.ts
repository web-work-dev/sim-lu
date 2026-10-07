import { METADATA_KEYS } from "../metadata/keys.js";

/**
 * Registers guards that run before a handler is invoked.
 *
 * Can be applied at the class level (applies to all routes) or the method level.
 *
 * @param guards - Guardian classes to execute.
 */
export function UseGuards(
    ...guards: readonly Function[]
): ClassDecorator & MethodDecorator {
    return (
        target: object | Function,
        propertyKey?: string | symbol,
    ): void => {
        if (propertyKey !== undefined) {
            const existing =
                Reflect.getMetadata(
                    METADATA_KEYS.GUARD,
                    target,
                    propertyKey,
                ) as Function[] | undefined;

            Reflect.defineMetadata(
                METADATA_KEYS.GUARD,
                [...(existing ?? []), ...guards],
                target,
                propertyKey,
            );

            return;
        }

        const existing =
            Reflect.getMetadata(
                METADATA_KEYS.GUARD,
                target,
            ) as Function[] | undefined;

        Reflect.defineMetadata(
            METADATA_KEYS.GUARD,
            [...(existing ?? []), ...guards],
            target,
        );
    };
}