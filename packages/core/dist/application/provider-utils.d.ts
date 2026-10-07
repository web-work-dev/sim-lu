import type { CustomProvider, ModuleProvider, ProviderScope, ProviderToken } from "@sim-lu/common";
export declare function isCustomProvider(provider: ModuleProvider): provider is CustomProvider;
export declare function providerToken(provider: ModuleProvider): ProviderToken;
export declare function tokenName(token: ProviderToken): string;
export declare function providerScope(provider: ModuleProvider): ProviderScope;
//# sourceMappingURL=provider-utils.d.ts.map