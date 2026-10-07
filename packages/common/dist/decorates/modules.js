import { METADATA_KEYS } from "../metadata/keys.js";
/**
 * Marks a class as a module, declaring its controllers and providers.
 *
 * @param metadata - Module metadata including controllers, providers, and
 *   imported/exports.
 */
export function Module(metadata = {}) {
    return (target) => {
        Reflect.defineMetadata(METADATA_KEYS.MODULE, metadata, target);
    };
}
//# sourceMappingURL=modules.js.map