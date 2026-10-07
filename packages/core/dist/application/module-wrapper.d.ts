import type { ModuleMetadata, ModuleProvider, ProviderToken } from "@sim-lu/common";
import { Container } from "../container/container.js";
import { ModuleRef } from "../module/module-ref.js";
import { ControllerRegistry } from "../controller/controller-registry.js";
export declare class ModuleWrapper {
    readonly metatype: Function;
    readonly metadata: ModuleMetadata;
    readonly container: Container;
    readonly moduleRef: ModuleRef;
    readonly imports: ModuleWrapper[];
    readonly instances: Map<ProviderToken, unknown>;
    controllerRegistry: ControllerRegistry | undefined;
    constructor(metatype: Function, metadata: ModuleMetadata);
    get providers(): readonly ModuleProvider[];
    get controllers(): readonly Function[];
    get exportTokens(): readonly ProviderToken[];
    get isGlobal(): boolean;
    addImport(module: ModuleWrapper): void;
}
//# sourceMappingURL=module-wrapper.d.ts.map