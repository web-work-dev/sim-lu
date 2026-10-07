import { METADATA_KEYS } from "../metadata/keys.js";
const BUILTIN_PARAM_TYPES = new Set([
    Object,
    String,
    Number,
    Boolean,
    Function,
    Array,
]);
/**
 * Explicitly specifies a provider token to inject into a constructor parameter.
 *
 * @param token - The injection token to bind to the parameter.
 */
export function Inject(token) {
    return (target, _propertyKey, parameterIndex) => {
        const existing = Reflect.getMetadata(METADATA_KEYS.CONSTRUCTOR_PARAMS, target);
        Reflect.defineMetadata(METADATA_KEYS.CONSTRUCTOR_PARAMS, {
            ...(existing ?? {}),
            [parameterIndex]: token,
        }, target);
    };
}
/**
 * Retrieves the constructor injection tokens for a class, preserving
 * the parameter order.
 *
 * @param target - The class constructor to inspect.
 */
export function getConstructorTokens(target) {
    return (Reflect.getMetadata(METADATA_KEYS.CONSTRUCTOR_PARAMS, target) ?? {});
}
export function isUsableParamType(token) {
    if (token == null || typeof token === "undefined") {
        return false;
    }
    if (typeof token === "function" && BUILTIN_PARAM_TYPES.has(token)) {
        return false;
    }
    return true;
}
export function getDesignParamTypes(target) {
    return Reflect.getMetadata("design:paramtypes", target) ?? [];
}
export function getConstructorParamNames(target) {
    const source = Function.prototype.toString.call(target);
    const match = source.match(/(?:constructor|function\s+[A-Za-z0-9_$]*)\s*\(([^)]*)\)/);
    if (!match?.[1]) {
        return [];
    }
    return match[1]
        .split(",")
        .map((parameter) => parameter.trim())
        .filter((parameter) => parameter.length > 0 && parameter !== "...")
        .map((parameter) => {
        const withoutDefault = parameter.split("=")[0]?.trim() ?? "";
        const name = withoutDefault.split(/\s+/).at(-1) ?? "";
        return name.replace(/^\.{3}/, "").replace(/[?:].*$/, "");
    })
        .filter((name) => name.length > 0);
}
export function getConstructorDependencies(target) {
    const design = [...getDesignParamTypes(target)];
    const injected = getConstructorTokens(target);
    const indexes = Object.keys(injected).map(Number);
    const length = Math.max(design.length, target.length, indexes.length === 0 ? 0 : Math.max(...indexes) + 1);
    while (design.length < length) {
        design.push(undefined);
    }
    for (const [index, token] of Object.entries(injected)) {
        design[Number(index)] = token;
    }
    return design;
}
export function matchTokenByParamName(name, tokens) {
    const needle = name.replace(/^_+/, "").toLowerCase();
    if (!needle) {
        return undefined;
    }
    for (const token of tokens) {
        if (typeof token === "function" && token.name.toLowerCase() === needle) {
            return token;
        }
    }
    return undefined;
}
//# sourceMappingURL=inject.js.map