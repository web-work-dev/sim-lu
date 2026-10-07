import { METADATA_KEYS } from "@sim-lu/common";
import type { DynamicModule, ModuleMetadata } from "@sim-lu/common";

import {
    ModuleContainer,
    isDynamicModule,
} from "../module/module-container.js";
import { ModuleWrapper } from "./module-wrapper.js";

export interface CompiledModules {
    readonly root: ModuleWrapper;
    readonly modules: ReadonlyMap<Function, ModuleWrapper>;
}

export class ModuleCompiler {
    public constructor(
        private readonly modules = new ModuleContainer(),
    ) { }

    public compile(
        root: Function | DynamicModule,
    ): CompiledModules {
        const compiled = new Map<Function, ModuleWrapper>();
        const visiting = new Set<Function>();

        const wrapper = this.visit(root, compiled, visiting);

        return {
            root: wrapper,
            modules: compiled,
        };
    }

    public getModuleContainer(): ModuleContainer {
        return this.modules;
    }

    private visit(
        target: Function | DynamicModule,
        compiled: Map<Function, ModuleWrapper>,
        visiting: Set<Function>,
    ): ModuleWrapper {
        const metatype = isDynamicModule(target) ? target.module : target;
        const extra = isDynamicModule(target) ? target : undefined;
        const existing = compiled.get(metatype);

        if (existing) {
            return existing;
        }

        if (visiting.has(metatype)) {
            throw new Error(
                `Circular module import detected: "${this.getModuleName(metatype)}"`,
            );
        }

        visiting.add(metatype);

        this.modules.register(metatype, extra);
        const metadata = this.modules.get(metatype);
        const wrapper = new ModuleWrapper(metatype, metadata);

        for (const imported of metadata.imports ?? []) {
            wrapper.addImport(
                this.visit(imported, compiled, visiting),
            );
        }

        visiting.delete(metatype);
        compiled.set(metatype, wrapper);

        return wrapper;
    }

    public static isModule(
        target: Function,
    ): boolean {
        const metadata = Reflect.getMetadata(
            METADATA_KEYS.MODULE,
            target,
        ) as ModuleMetadata | undefined;

        return metadata !== undefined;
    }

    private getModuleName(
        metatype: Function,
    ): string {
        return metatype.name || "<anonymous>";
    }
}
