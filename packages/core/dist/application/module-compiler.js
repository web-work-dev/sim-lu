import { METADATA_KEYS } from "@sim-lu/common";
import { ModuleContainer, isDynamicModule, } from "../module/module-container.js";
import { ModuleWrapper } from "./module-wrapper.js";
export class ModuleCompiler {
    modules;
    constructor(modules = new ModuleContainer()) {
        this.modules = modules;
    }
    compile(root) {
        const compiled = new Map();
        const visiting = new Set();
        const wrapper = this.visit(root, compiled, visiting);
        return {
            root: wrapper,
            modules: compiled,
        };
    }
    getModuleContainer() {
        return this.modules;
    }
    visit(target, compiled, visiting) {
        const metatype = isDynamicModule(target) ? target.module : target;
        const extra = isDynamicModule(target) ? target : undefined;
        const existing = compiled.get(metatype);
        if (existing) {
            return existing;
        }
        if (visiting.has(metatype)) {
            throw new Error(`Circular module import detected: "${this.getModuleName(metatype)}"`);
        }
        visiting.add(metatype);
        this.modules.register(metatype, extra);
        const metadata = this.modules.get(metatype);
        const wrapper = new ModuleWrapper(metatype, metadata);
        for (const imported of metadata.imports ?? []) {
            wrapper.addImport(this.visit(imported, compiled, visiting));
        }
        visiting.delete(metatype);
        compiled.set(metatype, wrapper);
        return wrapper;
    }
    static isModule(target) {
        const metadata = Reflect.getMetadata(METADATA_KEYS.MODULE, target);
        return metadata !== undefined;
    }
    getModuleName(metatype) {
        return metatype.name || "<anonymous>";
    }
}
//# sourceMappingURL=module-compiler.js.map