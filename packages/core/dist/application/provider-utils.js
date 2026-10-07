import { METADATA_KEYS } from "@sim-lu/common";
export function isCustomProvider(provider) {
    return typeof provider === "object"
        && provider !== null
        && "token" in provider;
}
export function providerToken(provider) {
    return isCustomProvider(provider) ? provider.token : provider;
}
export function tokenName(token) {
    if (typeof token === "function") {
        return token.name || "<anonymous>";
    }
    if (typeof token === "symbol") {
        return token.toString();
    }
    return token;
}
export function providerScope(provider) {
    if (isCustomProvider(provider) && provider.scope !== undefined) {
        return provider.scope;
    }
    if (isCustomProvider(provider) && "useValue" in provider) {
        return "singleton";
    }
    if (isCustomProvider(provider) && "useFactory" in provider) {
        return provider.scope ?? "transient";
    }
    if (!isCustomProvider(provider) && typeof provider === "function") {
        const metadata = Reflect.getMetadata(METADATA_KEYS.INJECTABLE, provider);
        return metadata?.scope ?? "singleton";
    }
    return "singleton";
}
//# sourceMappingURL=provider-utils.js.map