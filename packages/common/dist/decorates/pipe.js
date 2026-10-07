import { METADATA_KEYS } from "../metadata/keys.js";
/**
 * Registers pipes that transform handler input parameters.
 *
 * Can be applied at the class level or the method level.
 *
 * @param pipes - Pipe classes to apply.
 */
export function UsePipes(...pipes) {
    return (target, propertyKey) => {
        if (propertyKey !== undefined) {
            const existing = Reflect.getMetadata(METADATA_KEYS.PIPE, target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.PIPE, [...(existing ?? []), ...pipes], target, propertyKey);
            return;
        }
        const existing = Reflect.getMetadata(METADATA_KEYS.PIPE, target);
        Reflect.defineMetadata(METADATA_KEYS.PIPE, [...(existing ?? []), ...pipes], target);
    };
}
//# sourceMappingURL=pipe.js.map