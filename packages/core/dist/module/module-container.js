import { METADATA_KEYS, isGlobalModule } from "@sim-lu/common";
export function isDynamicModule(value) {
    return typeof value === "object"
        && value !== null
        && typeof value.module === "function";
}
export function mergeModuleMetadata(base, extra) {
    return {
        imports: [
            ...(base?.imports ?? []),
            ...(extra?.imports ?? []),
        ],
        controllers: [
            ...(base?.controllers ?? []),
            ...(extra?.controllers ?? []),
        ],
        providers: [
            ...(base?.providers ?? []),
            ...(extra?.providers ?? []),
        ],
        exports: [
            ...(base?.exports ?? []),
            ...(extra?.exports ?? []),
        ],
        ...(base?.global || extra?.global ? { global: true } : {}),
    };
}
export class ModuleContainer {
    modules = new Map();
    register(module, extra) {
        const decorated = Reflect.getMetadata(METADATA_KEYS.MODULE, module);
        if (!decorated && extra === undefined) {
            throw new Error(`Class "${module.name || "<anonymous>"}" is not decorated with @Module()`);
        }
        const metadata = mergeModuleMetadata(decorated, extra);
        const global = metadata.global === true || isGlobalModule(module);
        this.modules.set(module, global ? { ...metadata, global: true } : metadata);
    }
    has(module) {
        return this.modules.has(module);
    }
    get(module) {
        const metadata = this.modules.get(module);
        if (!metadata) {
            throw new Error(`Module "${module.name || "<anonymous>"}" is not registered`);
        }
        return metadata;
    }
    getAll() {
        return this.modules;
    }
}
//# sourceMappingURL=module-container.js.map