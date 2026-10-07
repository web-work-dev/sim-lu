import { METADATA_KEYS, isGlobalModule } from "@sim-lu/common";
import type {
    DynamicModule,
    ModuleMetadata,
    ModuleProvider,
    ProviderToken,
} from "@sim-lu/common";

export function isDynamicModule(
    value: Function | DynamicModule,
): value is DynamicModule {
    return typeof value === "object"
        && value !== null
        && typeof (value as DynamicModule).module === "function";
}

export function mergeModuleMetadata(
    base: ModuleMetadata | undefined,
    extra: ModuleMetadata | undefined,
): ModuleMetadata {
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
        ] as ModuleProvider[],
        exports: [
            ...(base?.exports ?? []),
            ...(extra?.exports ?? []),
        ] as ProviderToken[],
        ...(base?.global || extra?.global ? { global: true } : {}),
    };
}

export class ModuleContainer {
    private readonly modules = new Map<
        Function,
        ModuleMetadata
    >();

    public register(
        module: Function,
        extra?: ModuleMetadata,
    ): void {
        const decorated = Reflect.getMetadata(
            METADATA_KEYS.MODULE,
            module,
        ) as ModuleMetadata | undefined;

        if (!decorated && extra === undefined) {
            throw new Error(
                `Class "${module.name || "<anonymous>"}" is not decorated with @Module()`,
            );
        }

        const metadata = mergeModuleMetadata(decorated, extra);
        const global = metadata.global === true || isGlobalModule(module);

        this.modules.set(module, global ? { ...metadata, global: true } : metadata);
    }

    public has(
        module: Function,
    ): boolean {
        return this.modules.has(module);
    }

    public get(
        module: Function,
    ): ModuleMetadata {
        const metadata = this.modules.get(module);

        if (!metadata) {
            throw new Error(
                `Module "${module.name || "<anonymous>"}" is not registered`,
            );
        }

        return metadata;
    }

    public getAll(): ReadonlyMap<
        Function,
        ModuleMetadata
    > {
        return this.modules;
    }
}
