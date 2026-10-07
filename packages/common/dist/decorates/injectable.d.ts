import type { InjectableMetadata } from "../metadata/types.js";
/**
 * Marks a class as injectable, making it eligible for dependency injection.
 *
 * @param metadata - Optional metadata, e.g. `{ scope: "request" }` for
 *   per-request scoped providers. Defaults to `{ scope: "singleton" }`.
 */
export declare function Injectable(metadata?: InjectableMetadata): ClassDecorator;
//# sourceMappingURL=injectable.d.ts.map