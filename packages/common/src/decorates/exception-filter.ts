import { METADATA_KEYS } from "../metadata/keys.js";

/**
 * Registers exception filters to catch errors thrown by handlers.
 *
 * Can be applied at the class level or the method level.
 *
 * @param filters - Exception filter classes to apply.
 */
export function UseFilters(
    ...filters: readonly Function[]
): ClassDecorator & MethodDecorator {
    return (
        target: object | Function,
        propertyKey?: string | symbol,
    ): void => {
        if (propertyKey !== undefined) {
            const existing =
                Reflect.getMetadata(
                    METADATA_KEYS.EXCEPTION_FILTER,
                    target,
                    propertyKey,
                ) as Function[] | undefined;

            Reflect.defineMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                [...(existing ?? []), ...filters],
                target,
                propertyKey,
            );

            return;
        }

        const existing =
            Reflect.getMetadata(
                METADATA_KEYS.EXCEPTION_FILTER,
                target,
            ) as Function[] | undefined;

        Reflect.defineMetadata(
            METADATA_KEYS.EXCEPTION_FILTER,
            [...(existing ?? []), ...filters],
            target,
        );
    };
}

/**
 * Marks a class as an exception filter that only catches the specified
 * exception types.
 *
 * @param types - Exception classes (or tokens) to catch.
 */
export function Catch(
    ...types: readonly Function[]
): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(
            METADATA_KEYS.CATCH,
            types,
            target,
        );
    };
}
