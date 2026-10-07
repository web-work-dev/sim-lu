import { METADATA_KEYS } from "../metadata/keys.js";
/**
 * Marks a class as an HTTP controller and optionally specifies a base path
 * for all its routes.
 *
 * @param path - Base path prefix for all routes in this controller.
 */
export function Controller(path = "") {
    return (target) => {
        const controllerMetadata = {
            path,
        };
        Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, controllerMetadata, target);
    };
}
//# sourceMappingURL=controller.js.map