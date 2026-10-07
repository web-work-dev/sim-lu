import type { DynamicModule, ModuleMetadata } from "@sim-lu/common";
export declare function isDynamicModule(value: Function | DynamicModule): value is DynamicModule;
export declare function mergeModuleMetadata(base: ModuleMetadata | undefined, extra: ModuleMetadata | undefined): ModuleMetadata;
export declare class ModuleContainer {
    private readonly modules;
    register(module: Function, extra?: ModuleMetadata): void;
    has(module: Function): boolean;
    get(module: Function): ModuleMetadata;
    getAll(): ReadonlyMap<Function, ModuleMetadata>;
}
//# sourceMappingURL=module-container.d.ts.map