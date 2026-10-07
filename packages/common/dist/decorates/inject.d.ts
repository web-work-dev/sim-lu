import type { ProviderToken } from "../metadata/types.js";
/**
 * Explicitly specifies a provider token to inject into a constructor parameter.
 *
 * @param token - The injection token to bind to the parameter.
 */
export declare function Inject(token: ProviderToken): ParameterDecorator;
/**
 * Retrieves the constructor injection tokens for a class, preserving
 * the parameter order.
 *
 * @param target - The class constructor to inspect.
 */
export declare function getConstructorTokens(target: Function): Readonly<Record<number, ProviderToken>>;
export declare function isUsableParamType(token: unknown): token is ProviderToken;
export declare function getDesignParamTypes(target: Function): ProviderToken[];
export declare function getConstructorParamNames(target: Function): string[];
export declare function getConstructorDependencies(target: Function): ProviderToken[];
export declare function matchTokenByParamName(name: string, tokens: Iterable<ProviderToken>): ProviderToken | undefined;
//# sourceMappingURL=inject.d.ts.map