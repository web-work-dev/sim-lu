import type { ProviderScope } from "@sim-lu/common";
import type { InjectToken } from "./token.js";
export interface ClassProvider<T = unknown> {
    readonly token: InjectToken<T>;
    readonly useClass: new (...args: any[]) => T;
    readonly scope?: ProviderScope;
}
export interface ValueProvider<T = unknown> {
    readonly token: InjectToken<T>;
    readonly useValue: T;
}
export interface FactoryProvider<T = unknown> {
    readonly token: InjectToken<T>;
    readonly useFactory: (...args: any[]) => T | Promise<T>;
    readonly inject?: readonly InjectToken[];
    readonly scope?: ProviderScope;
}
/**
 * @remarks
 * This type is used to define providers in the dependency injection container.
 * It can be a class constructor, an interface, a symbol, or a string.
 * @example
 * ```typescript
 * import { provider } from "@sim-lu/core";
 *
 * export const MY_SERVICE_PROVIDER: provider<MyService> = {
 *     token: MY_SERVICE_TOKEN,
 *     useClass: MyService,
 * };
 * ```
 */
export type Provider<T = unknown> = ClassProvider<T> | ValueProvider<T> | FactoryProvider<T>;
//# sourceMappingURL=provider.d.ts.map