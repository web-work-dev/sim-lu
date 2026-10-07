import { Container } from "../container/container.js";
import { ModuleRef } from "../module/module-ref.js";
import { ControllerRegistry } from "../controller/controller-registry.js";
export class ModuleWrapper {
    metatype;
    metadata;
    container = new Container();
    moduleRef;
    imports = [];
    instances = new Map();
    controllerRegistry;
    constructor(metatype, metadata) {
        this.metatype = metatype;
        this.metadata = metadata;
        this.moduleRef = new ModuleRef(this.container);
    }
    get providers() {
        return this.metadata.providers ?? [];
    }
    get controllers() {
        return this.metadata.controllers ?? [];
    }
    get exportTokens() {
        return this.metadata.exports ?? [];
    }
    get isGlobal() {
        return this.metadata.global === true;
    }
    addImport(module) {
        this.imports.push(module);
    }
}
//# sourceMappingURL=module-wrapper.js.map