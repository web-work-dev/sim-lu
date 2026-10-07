import { METADATA_KEYS } from "../metadata/keys.js";
/**
 * Registers guards that run before a handler is invoked.
 *
 * Can be applied at the class level (applies to all routes) or the method level.
 *
 * @param guards - Guardian classes to execute.
 */
export function UseGuards(...guards) {
    return (target, propertyKey) => {
        if (propertyKey !== undefined) {
            const existing = Reflect.getMetadata(METADATA_KEYS.GUARD, target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.GUARD, [...(existing ?? []), ...guards], target, propertyKey);
            return;
        }
        const existing = Reflect.getMetadata(METADATA_KEYS.GUARD, target);
        Reflect.defineMetadata(METADATA_KEYS.GUARD, [...(existing ?? []), ...guards], target);
    };
}
//# sourceMappingURL=guard.js.map