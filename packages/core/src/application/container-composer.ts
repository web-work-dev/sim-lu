import {
    METADATA_KEYS,
    getConstructorDependencies,
    getConstructorParamNames,
    isUsableParamType,
    matchTokenByParamName,
    type CustomProvider,
    type ProviderToken,
} from "@sim-lu/common";

import type { InjectToken } from "../container/token.js";
import { ControllerRegistry } from "../controller/controller-registry.js";
import { ModuleRef } from "../module/module-ref.js";
import { ModuleCompiler, type CompiledModules } from "./module-compiler.js";
import { ModuleWrapper } from "./module-wrapper.js";
import {
    isCustomProvider,
    providerScope,
    providerToken,
    tokenName,
} from "./provider-utils.js";

export class ContainerComposer {
    public async compose(
        compiled: CompiledModules,
    ): Promise<ModuleWrapper[]> {
        const order: ModuleWrapper[] = [];
        const seen = new Set<ModuleWrapper>();

        await this.visit(compiled.root, compiled, seen, order);
        this.bindGlobals(compiled, order);

        return order;
    }

    private async visit(
        module: ModuleWrapper,
        compiled: CompiledModules,
        seen: Set<ModuleWrapper>,
        order: ModuleWrapper[],
    ): Promise<void> {
        if (seen.has(module)) {
            return;
        }

        seen.add(module);

        for (const imported of module.imports) {
            await this.visit(imported, compiled, seen, order);
        }

        this.registerModule(module, compiled);
        await this.instantiate(module);
        order.push(module);
    }

    private registerModule(
        module: ModuleWrapper,
        compiled: CompiledModules,
    ): void {
        this.registerInternalProviders(module);
        this.bindImports(module, compiled);
        this.collectExports(module, compiled);
    }

    private registerInternalProviders(
        module: ModuleWrapper,
    ): void {
        module.container.register({
            token: ModuleRef,
            useValue: module.moduleRef,
        });

        for (const provider of module.providers) {
            this.registerProvider(module, provider);
        }

        for (const controller of module.controllers) {
            module.container.register({
                token: controller as InjectToken,
                useClass: controller as new (...args: any[]) => unknown,
            });
        }

        this.registerDecoratorProviders(module);
        module.controllerRegistry = new ControllerRegistry(module.container);
    }

    private registerDecoratorProviders(
        module: ModuleWrapper,
    ): void {
        for (const token of this.collectDecoratorProviders(module)) {
            if (module.container.has(token as InjectToken)) {
                continue;
            }

            module.container.register({
                token: token as InjectToken,
                useClass: token as new (...args: any[]) => unknown,
            });
        }
    }

    private collectDecoratorProviders(
        module: ModuleWrapper,
    ): Function[] {
        const tokens = new Set<Function>();

        for (const controller of module.controllers) {
            this.collectClassEnhancers(controller, tokens);
        }

        for (const provider of module.providers) {
            const token = providerToken(provider);

            if (typeof token === "function") {
                this.collectClassEnhancers(token, tokens);
            }

            if (isCustomProvider(provider) && typeof provider.useClass === "function") {
                this.collectClassEnhancers(provider.useClass, tokens);
            }
        }

        return [...tokens];
    }

    private collectClassEnhancers(
        target: Function,
        tokens: Set<Function>,
    ): void {
        this.addFunctionTokens(
            Reflect.getMetadata(METADATA_KEYS.GUARD, target),
            tokens,
        );
        this.addFunctionTokens(
            Reflect.getMetadata(METADATA_KEYS.INTERCEPTOR, target),
            tokens,
        );
        this.addFunctionTokens(
            Reflect.getMetadata(METADATA_KEYS.EXCEPTION_FILTER, target),
            tokens,
        );
        this.addFunctionTokens(
            Reflect.getMetadata(METADATA_KEYS.PIPE, target),
            tokens,
        );
        this.addFunctionTokens(
            Reflect.getMetadata(METADATA_KEYS.TRANSFORM, target),
            tokens,
        );

        const prototype = target.prototype as object | undefined;

        if (!prototype) {
            return;
        }

        for (const key of [
            ...Object.getOwnPropertyNames(prototype),
            ...Object.getOwnPropertySymbols(prototype),
        ]) {
            this.addFunctionTokens(
                Reflect.getMetadata(METADATA_KEYS.GUARD, prototype, key),
                tokens,
            );
            this.addFunctionTokens(
                Reflect.getMetadata(METADATA_KEYS.INTERCEPTOR, prototype, key),
                tokens,
            );
            this.addFunctionTokens(
                Reflect.getMetadata(METADATA_KEYS.EXCEPTION_FILTER, prototype, key),
                tokens,
            );
            this.addFunctionTokens(
                Reflect.getMetadata(METADATA_KEYS.PIPE, prototype, key),
                tokens,
            );
            this.addFunctionTokens(
                Reflect.getMetadata(METADATA_KEYS.TRANSFORM, prototype, key),
                tokens,
            );
            this.addFunctionTokens(
                (
                    Reflect.getMetadata(
                        METADATA_KEYS.PARAMETER_PIPES,
                        prototype,
                        key,
                    ) as Array<{ pipe: Function }> | undefined
                )?.map((entry) => entry.pipe),
                tokens,
            );
        }
    }

    private addFunctionTokens(
        values: readonly unknown[] | undefined,
        tokens: Set<Function>,
    ): void {
        for (const value of values ?? []) {
            if (typeof value === "function") {
                tokens.add(value);
            }
        }
    }

    private registerProvider(
        module: ModuleWrapper,
        provider: ModuleWrapper["providers"][number],
    ): void {
        if (!isCustomProvider(provider)) {
            module.container.register({
                token: provider as InjectToken,
                useClass: provider as new (...args: any[]) => unknown,
            });
            return;
        }

        const token = provider.token as InjectToken;

        if (Object.prototype.hasOwnProperty.call(provider, "useValue")) {
            module.container.register({
                token,
                useValue: provider.useValue,
            });
            return;
        }

        if (provider.useFactory) {
            module.container.register({
                token,
                useFactory: provider.useFactory,
                ...(provider.inject ? { inject: provider.inject as InjectToken[] } : {}),
            });
            return;
        }

        if (provider.useClass) {
            module.container.register({
                token,
                useClass: provider.useClass as new (...args: any[]) => unknown,
            });
        }
    }

    private bindImports(
        module: ModuleWrapper,
        compiled: CompiledModules,
    ): void {
        for (const imported of module.imports) {
            for (const token of this.collectExports(imported, compiled)) {
                const instance = this.findExportedInstance(
                    imported,
                    token,
                    compiled,
                );

                module.container.register({
                    token: token as InjectToken,
                    useValue: instance,
                });
            }
        }
    }

    private bindGlobals(
        compiled: CompiledModules,
        order: readonly ModuleWrapper[],
    ): void {
        const globals = order.filter((module) => module.isGlobal);

        for (const module of order) {
            for (const globalModule of globals) {
                if (globalModule === module) {
                    continue;
                }

                for (const token of this.collectExports(globalModule, compiled)) {
                    if (module.container.has(token as InjectToken)) {
                        continue;
                    }

                    const instance = this.findExportedInstance(
                        globalModule,
                        token,
                        compiled,
                    );

                    module.container.register({
                        token: token as InjectToken,
                        useValue: instance,
                    });
                }
            }
        }
    }

    private collectExports(
        module: ModuleWrapper,
        compiled: CompiledModules,
        visiting: Set<Function> = new Set(),
    ): ProviderToken[] {
        if (visiting.has(module.metatype)) {
            return [];
        }

        visiting.add(module.metatype);

        const tokens: ProviderToken[] = [];
        const local = new Set<ProviderToken>([
            ...module.providers.map(providerToken),
            ...module.controllers,
        ]);
        const importedMetatypes = new Set(
            module.imports.map((imported) => imported.metatype),
        );
        const exportedTokens = module.isGlobal && module.exportTokens.length === 0
            ? [...local]
            : module.exportTokens;

        for (const exported of exportedTokens) {
            if (typeof exported === "function" && ModuleCompiler.isModule(exported)) {
                if (!importedMetatypes.has(exported)) {
                    throw new Error(
                        `Module "${this.getName(module.metatype)}" cannot export "${tokenName(exported)}" because it is not imported`,
                    );
                }

                const exportedModule = compiled.modules.get(exported);

                if (!exportedModule) {
                    throw new Error(
                        `Exported module "${tokenName(exported)}" is not compiled`,
                    );
                }

                tokens.push(
                    ...this.collectExports(exportedModule, compiled, visiting),
                );
                continue;
            }

            if (!local.has(exported)) {
                throw new Error(
                    `Module "${this.getName(module.metatype)}" cannot export "${tokenName(exported)}" because it is not a local provider or controller`,
                );
            }

            tokens.push(exported);
        }

        return tokens;
    }

    private findExportedInstance(
        module: ModuleWrapper,
        token: ProviderToken,
        compiled: CompiledModules,
        visiting: Set<Function> = new Set(),
    ): unknown {
        if (module.instances.has(token)) {
            return module.instances.get(token);
        }

        if (visiting.has(module.metatype)) {
            throw new Error(
                `Unable to resolve exported token "${tokenName(token)}"`,
            );
        }

        visiting.add(module.metatype);

        for (const imported of module.imports) {
            const exported = this.collectExports(imported, compiled);

            if (!exported.includes(token)) {
                continue;
            }

            return this.findExportedInstance(
                imported,
                token,
                compiled,
                visiting,
            );
        }

        throw new Error(
            `Exported token "${tokenName(token)}" is not available in module "${this.getName(module.metatype)}"`,
        );
    }

    private async instantiate(module: ModuleWrapper): Promise<void> {
        const seen = new Set<ProviderToken>();

        for (const provider of module.providers) {
            const token = providerToken(provider);

            if (seen.has(token)) {
                continue;
            }

            seen.add(token);
            await this.instantiateProvider(module, provider, new Set());
        }

        for (const controller of module.controllers) {
            if (seen.has(controller)) {
                continue;
            }

            seen.add(controller);
            await this.instantiateToken(module, controller, controller, new Set());
        }

        for (const token of this.collectDecoratorProviders(module)) {
            if (seen.has(token)) {
                continue;
            }

            seen.add(token);
            await this.instantiateToken(module, token, token, new Set());
        }

        const registry = module.controllerRegistry;

        if (!registry) {
            throw new Error(
                `Controller registry is missing for module "${this.getName(module.metatype)}"`,
            );
        }

        for (const controller of module.controllers) {
            await registry.register(controller as InjectToken<object>);
        }
    }

    private async instantiateProvider(
        module: ModuleWrapper,
        provider: ModuleWrapper["providers"][number],
        stack: Set<ProviderToken>,
    ): Promise<unknown> {
        const token = providerToken(provider);

        if (module.instances.has(token)) {
            return module.instances.get(token);
        }

        if (isCustomProvider(provider)) {
            return this.instantiateCustomProvider(module, provider, stack);
        }

        return this.instantiateToken(module, token, provider, stack);
    }

    private async instantiateCustomProvider(
        module: ModuleWrapper,
        provider: CustomProvider,
        stack: Set<ProviderToken>,
    ): Promise<unknown> {
        const token = provider.token;
        const scope = providerScope(provider);

        if (Object.prototype.hasOwnProperty.call(provider, "useValue")) {
            module.instances.set(token, provider.useValue);
            return provider.useValue;
        }

        if (provider.useFactory) {
            const args = await Promise.all(
                (provider.inject ?? []).map((dependency) =>
                    this.resolveDependency(module, dependency, stack),
                ),
            );
            const instance = provider.useFactory(...args);

            module.instances.set(token, instance);

            if (scope === "singleton") {
                module.container.register({
                    token: token as InjectToken,
                    useValue: instance,
                });
            }

            return instance;
        }

        if (provider.useClass) {
            return this.instantiateToken(
                module,
                token,
                provider.useClass,
                stack,
            );
        }

        throw new Error(
            `Unsupported provider for token: ${tokenName(token)}`,
        );
    }

    private async instantiateToken(
        module: ModuleWrapper,
        token: ProviderToken,
        ctor: Function,
        stack: Set<ProviderToken>,
    ): Promise<unknown> {
        if (module.instances.has(token)) {
            return module.instances.get(token);
        }

        if (stack.has(token)) {
            throw new Error(
                `Circular provider dependency detected: "${tokenName(token)}"`,
            );
        }

        stack.add(token);

        const scope = providerScope(ctor);
        const instance = await this.construct(module, ctor, stack);

        module.instances.set(token, instance);

        if (scope === "singleton") {
            module.container.register({
                token: token as InjectToken,
                useValue: instance,
            });
        }

        stack.delete(token);

        return instance;
    }

    private async construct(
        module: ModuleWrapper,
        ctor: Function,
        stack: Set<ProviderToken>,
    ): Promise<unknown> {
        const dependencies = this.getConstructorDependencies(module, ctor);
        const args = await Promise.all(
            dependencies.map((dependency) =>
                this.resolveDependency(module, dependency, stack),
            ),
        );

        return new (ctor as new (...args: any[]) => unknown)(...args);
    }

    private async resolveDependency(
        module: ModuleWrapper,
        dependency: ProviderToken,
        stack: Set<ProviderToken>,
    ): Promise<unknown> {
        if (this.isLocalToken(module, dependency)) {
            const provider = this.findLocalProvider(module, dependency);

            if (provider) {
                return this.instantiateProvider(module, provider, stack);
            }

            if (typeof dependency === "function") {
                return this.instantiateToken(
                    module,
                    dependency,
                    dependency,
                    stack,
                );
            }
        }

        return module.container.resolve(dependency as InjectToken);
    }

    private getConstructorDependencies(
        module: ModuleWrapper,
        ctor: Function,
    ): ProviderToken[] {
        const params = getConstructorDependencies(ctor);
        const names = getConstructorParamNames(ctor);
        const known = this.collectKnownTokens(module);
        const length = Math.max(params.length, names.length);

        return Array.from({ length }, (_, index) => {
            const token = params[index];

            if (isUsableParamType(token) && this.canResolve(module, token)) {
                return token;
            }

            const name = names[index];

            if (name) {
                const matched = matchTokenByParamName(name, known);

                if (matched !== undefined) {
                    return matched;
                }
            }

            if (isUsableParamType(token)) {
                return token;
            }

            throw new Error(
                `Unable to resolve constructor parameter "${name ?? index}" of "${this.getName(ctor)}"`,
            );
        });
    }

    private canResolve(
        module: ModuleWrapper,
        token: ProviderToken,
    ): boolean {
        return this.isLocalToken(module, token)
            || module.container.has(token as InjectToken);
    }

    private collectKnownTokens(
        module: ModuleWrapper,
    ): ProviderToken[] {
        return [
            ...module.providers.map(providerToken),
            ...module.controllers,
            ...module.container.tokens() as Iterable<ProviderToken>,
        ];
    }

    private findLocalProvider(
        module: ModuleWrapper,
        token: ProviderToken,
    ): ModuleWrapper["providers"][number] | undefined {
        return module.providers.find(
            (provider) => providerToken(provider) === token,
        );
    }

    private isLocalToken(
        module: ModuleWrapper,
        token: ProviderToken,
    ): boolean {
        return module.providers.some(
            (provider) => providerToken(provider) === token,
        ) || module.controllers.includes(token as Function);
    }

    private getName(
        target: Function,
    ): string {
        return target.name || "<anonymous>";
    }
}
