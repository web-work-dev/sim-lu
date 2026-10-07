import { METADATA_KEYS } from "../metadata/keys.js";
/**
 * Registers interceptors that wrap a handler invocation.
 *
 * Can be applied at the class level or the method level.
 *
 * @param interceptors - Interceptor classes to execute.
 */
export function UseInterceptors(...interceptors) {
    return (target, propertyKey) => {
        if (propertyKey !== undefined) {
            const existing = Reflect.getMetadata(METADATA_KEYS.INTERCEPTOR, target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.INTERCEPTOR, [...(existing ?? []), ...interceptors], target, propertyKey);
            return;
        }
        const existing = Reflect.getMetadata(METADATA_KEYS.INTERCEPTOR, target);
        Reflect.defineMetadata(METADATA_KEYS.INTERCEPTOR, [...(existing ?? []), ...interceptors], target);
    };
}
//# sourceMappingURL=interceptor.js.map