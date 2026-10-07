import { METADATA_KEYS } from "../metadata/keys.js";

import type { ControllerMetadata } from "../metadata/types.js";

/**
 * Marks a class as an HTTP controller and optionally specifies a base path
 * for all its routes.
 *
 * @param path - Base path prefix for all routes in this controller.
 */
export function Controller(
    path: string = ""
): ClassDecorator {
    return (target) => {
        const controllerMetadata: ControllerMetadata = {
            path,
        };

        Reflect.defineMetadata(
            METADATA_KEYS.CONTROLLER,
            controllerMetadata,
            target,
        );
    };
}