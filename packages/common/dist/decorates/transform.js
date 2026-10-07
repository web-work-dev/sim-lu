import { METADATA_KEYS } from "../metadata/keys.js";
/**
 * Registers transformers that transform the handler return value.
 *
 * Can be applied at the class level or the method level.
 *
 * @param transformers - Transformer classes to apply.
 */
export function UseTransformers(...transformers) {
    return (target, propertyKey) => {
        if (propertyKey !== undefined) {
            const existing = Reflect.getMetadata(METADATA_KEYS.TRANSFORM, target, propertyKey);
            Reflect.defineMetadata(METADATA_KEYS.TRANSFORM, [...(existing ?? []), ...transformers], target, propertyKey);
            return;
        }
        const existing = Reflect.getMetadata(METADATA_KEYS.TRANSFORM, target);
        Reflect.defineMetadata(METADATA_KEYS.TRANSFORM, [...(existing ?? []), ...transformers], target);
    };
}
//# sourceMappingURL=transform.js.map