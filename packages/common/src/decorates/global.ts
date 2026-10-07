import { METADATA_KEYS } from "../metadata/keys.js";

/**
 * Marks a module as globally available, allowing its providers to be
 * resolved from any module in the application.
 */
export function Global(): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(
            METADATA_KEYS.GLOBAL_MODULE,
            true,
            target,
        );
    };
}

/**
 * Checks whether a module is marked as global.
 *
 * @param target - The module class to check.
 */
export function isGlobalModule(
    target: Function,
): boolean {
    return Reflect.getMetadata(
        METADATA_KEYS.GLOBAL_MODULE,
        target,
    ) === true;
}
