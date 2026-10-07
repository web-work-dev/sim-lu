import type { DynamicModule } from "@sim-lu/common";
import { ModuleContainer } from "../module/module-container.js";
import { ModuleWrapper } from "./module-wrapper.js";
export interface CompiledModules {
    readonly root: ModuleWrapper;
    readonly modules: ReadonlyMap<Function, ModuleWrapper>;
}
export declare class ModuleCompiler {
    private readonly modules;
    constructor(modules?: ModuleContainer);
    compile(root: Function | DynamicModule): CompiledModules;
    getModuleContainer(): ModuleContainer;
    private visit;
    static isModule(target: Function): boolean;
    private getModuleName;
}
//# sourceMappingURL=module-compiler.d.ts.map