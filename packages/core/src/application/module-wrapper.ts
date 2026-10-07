import type {
    ModuleMetadata,
    ModuleProvider,
    ProviderToken,
} from "@sim-lu/common";

import { Container } from "../container/container.js";
import { ModuleRef } from "../module/module-ref.js";
import { ControllerRegistry } from "../controller/controller-registry.js";

export class ModuleWrapper {
    public readonly container: Container = new Container();
    public readonly moduleRef: ModuleRef;
    public readonly imports: ModuleWrapper[] = [];
    public readonly instances = new Map<ProviderToken, unknown>();
    public controllerRegistry: ControllerRegistry | undefined;

    public constructor(
        public readonly metatype: Function,
        public readonly metadata: ModuleMetadata,
    ) {
        this.moduleRef = new ModuleRef(this.container);
    }

    public get providers(): readonly ModuleProvider[] {
        return this.metadata.providers ?? [];
    }

    public get controllers(): readonly Function[] {
        return this.metadata.controllers ?? [];
    }

    public get exportTokens(): readonly ProviderToken[] {
        return this.metadata.exports ?? [];
    }

    public get isGlobal(): boolean {
        return this.metadata.global === true;
    }

    public addImport(
        module: ModuleWrapper,
    ): void {
        this.imports.push(module);
    }
}
