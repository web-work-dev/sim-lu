import { METADATA_KEYS } from "../metadata/keys.js";

import type { InjectableMetadata } from "../metadata/types.js";

/**
 * Marks a class as injectable, making it eligible for dependency injection.
 *
 * @param metadata - Optional metadata, e.g. `{ scope: "request" }` for
 *   per-request scoped providers. Defaults to `{ scope: "singleton" }`.
 */
export function Injectable(
    metadata: InjectableMetadata = {},
): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(
            METADATA_KEYS.INJECTABLE,
            {
                scope: metadata.scope ?? "singleton",
            },
            target,
        );
    };
};