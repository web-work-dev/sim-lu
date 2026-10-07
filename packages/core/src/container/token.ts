/**
 * Dependency Injection Token
 *
 * @remarks
 * This type is used to identify dependencies in the dependency injection container.
 * It can be a class constructor, an interface, a symbol, or a string.
 *
 * @template T - The type of the dependency.
 * @example
 * ```typescript
 * import { InjectToken } from '@sim-lu/core';
 *
 * export const MY_SERVICE_TOKEN: InjectToken<MyService> = Symbol('MY_SERVICE_TOKEN');
 * ```
 *
 * @example
 * ```typescript
 * import { InjectToken } from '@sim-lu/core';
 *
 * export class MyService {}
 * export const MY_SERVICE_TOKEN: InjectToken<MyService> = MyService;
 * ```
 */
export type InjectToken<T = unknown> =
    | (new (...args: any[]) => T)
    | symbol
    | string;