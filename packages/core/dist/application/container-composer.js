import { METADATA_KEYS, getConstructorDependencies, getConstructorParamNames, isUsableParamType, matchTokenByParamName, } from "@sim-lu/common";
import { ControllerRegistry } from "../controller/controller-registry.js";
import { ModuleRef } from "../module/module-ref.js";
import { ModuleCompiler } from "./module-compiler.js";
import { ModuleWrapper } from "./module-wrapper.js";
import { isCustomProvider, providerScope, providerToken, tokenName, } from "./provider-utils.js";
export class ContainerComposer {
    async compose(compiled) {
        const order = [];
        const seen = new Set();
        await this.visit(compiled.root, compiled, seen, order);
        this.bindGlobals(compiled, order);
        return order;
    }
    async visit(module, compiled, seen, order) {
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
    registerModule(module, compiled) {
        this.registerInternalProviders(module);
        this.bindImports(module, compiled);
        this.collectExports(module, compiled);
    }
    registerInternalProviders(module) {
        module.container.register({
            token: ModuleRef,
            useValue: module.moduleRef,
        });
        for (const provider of module.providers) {
            this.registerProvider(module, provider);
        }
        for (const controller of module.controllers) {
            module.container.register({
                token: controller,
                useClass: controller,
            });
        }
        this.registerDecoratorProviders(module);
        module.controllerRegistry = new ControllerRegistry(module.container);
    }
    registerDecoratorProviders(module) {
        for (const token of this.collectDecoratorProviders(module)) {
            if (module.container.has(token)) {
                continue;
            }
            module.container.register({
                token: token,
                useClass: token,
            });
        }
    }
    collectDecoratorProviders(module) {
        const tokens = new Set();
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
    collectClassEnhancers(target, tokens) {
        this.addFunctionTokens(Reflect.getMetadata(METADATA_KEYS.GUARD, target), tokens);
        this.addFunctionTokens(Reflect.getMetadata(METADATA_KEYS.INTERCEPTOR, target), tokens);
        this.addFunctionTokens(Reflect.getMetadata(METADATA_KEYS.EXCEPTION_FILTER, target), tokens);
        this.addFunctionTokens(Reflect.getMetadata(METADATA_KEYS.PIPE, target), tokens);
        this.addFunctionTokens(Reflect.getMetadata(METADATA_KEYS.TRANSFORM, target), tokens);
        const prototype = target.prototype;
        if (!prototype) {
            return;
        }
        for (const key of [
            ...Object.getOwnPropertyNames(prototype),
            ...Object.getOwnPropertySymbols(prototype),
        ]) {
            this.addFunctionTokens(Reflect.getMetadata(METADATA_KEYS.GUARD, prototype, key), tokens);
            this.addFunctionTokens(Reflect.getMetadata(METADATA_KEYS.INTERCEPTOR, prototype, key), tokens);
            this.addFunctionTokens(Reflect.getMetadata(METADATA_KEYS.EXCEPTION_FILTER, prototype, key), tokens);
            this.addFunctionTokens(Reflect.getMetadata(METADATA_KEYS.PIPE, prototype, key), tokens);
            this.addFunctionTokens(Reflect.getMetadata(METADATA_KEYS.TRANSFORM, prototype, key), tokens);
            this.addFunctionTokens(Reflect.getMetadata(METADATA_KEYS.PARAMETER_PIPES, prototype, key)?.map((entry) => entry.pipe), tokens);
        }
    }
    addFunctionTokens(values, tokens) {
        for (const value of values ?? []) {
            if (typeof value === "function") {
                tokens.add(value);
            }
        }
    }
    registerProvider(module, provider) {
        if (!isCustomProvider(provider)) {
            module.container.register({
                token: provider,
                useClass: provider,
            });
            return;
        }
        const token = provider.token;
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
                ...(provider.inject ? { inject: provider.inject } : {}),
            });
            return;
        }
        if (provider.useClass) {
            module.container.register({
                token,
                useClass: provider.useClass,
            });
        }
    }
    bindImports(module, compiled) {
        for (const imported of module.imports) {
            for (const token of this.collectExports(imported, compiled)) {
                const instance = this.findExportedInstance(imported, token, compiled);
                module.container.register({
                    token: token,
                    useValue: instance,
                });
            }
        }
    }
    bindGlobals(compiled, order) {
        const globals = order.filter((module) => module.isGlobal);
        for (const module of order) {
            for (const globalModule of globals) {
                if (globalModule === module) {
                    continue;
                }
                for (const token of this.collectExports(globalModule, compiled)) {
                    if (module.container.has(token)) {
                        continue;
                    }
                    const instance = this.findExportedInstance(globalModule, token, compiled);
                    module.container.register({
                        token: token,
                        useValue: instance,
                    });
                }
            }
        }
    }
    collectExports(module, compiled, visiting = new Set()) {
        if (visiting.has(module.metatype)) {
            return [];
        }
        visiting.add(module.metatype);
        const tokens = [];
        const local = new Set([
            ...module.providers.map(providerToken),
            ...module.controllers,
        ]);
        const importedMetatypes = new Set(module.imports.map((imported) => imported.metatype));
        const exportedTokens = module.isGlobal && module.exportTokens.length === 0
            ? [...local]
            : module.exportTokens;
        for (const exported of exportedTokens) {
            if (typeof exported === "function" && ModuleCompiler.isModule(exported)) {
                if (!importedMetatypes.has(exported)) {
                    throw new Error(`Module "${this.getName(module.metatype)}" cannot export "${tokenName(exported)}" because it is not imported`);
                }
                const exportedModule = compiled.modules.get(exported);
                if (!exportedModule) {
                    throw new Error(`Exported module "${tokenName(exported)}" is not compiled`);
                }
                tokens.push(...this.collectExports(exportedModule, compiled, visiting));
                continue;
            }
            if (!local.has(exported)) {
                throw new Error(`Module "${this.getName(module.metatype)}" cannot export "${tokenName(exported)}" because it is not a local provider or controller`);
            }
            tokens.push(exported);
        }
        return tokens;
    }
    findExportedInstance(module, token, compiled, visiting = new Set()) {
        if (module.instances.has(token)) {
            return module.instances.get(token);
        }
        if (visiting.has(module.metatype)) {
            throw new Error(`Unable to resolve exported token "${tokenName(token)}"`);
        }
        visiting.add(module.metatype);
        for (const imported of module.imports) {
            const exported = this.collectExports(imported, compiled);
            if (!exported.includes(token)) {
                continue;
            }
            return this.findExportedInstance(imported, token, compiled, visiting);
        }
        throw new Error(`Exported token "${tokenName(token)}" is not available in module "${this.getName(module.metatype)}"`);
    }
    async instantiate(module) {
        const seen = new Set();
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
            throw new Error(`Controller registry is missing for module "${this.getName(module.metatype)}"`);
        }
        for (const controller of module.controllers) {
            await registry.register(controller);
        }
    }
    async instantiateProvider(module, provider, stack) {
        const token = providerToken(provider);
        if (module.instances.has(token)) {
            return module.instances.get(token);
        }
        if (isCustomProvider(provider)) {
            return this.instantiateCustomProvider(module, provider, stack);
        }
        return this.instantiateToken(module, token, provider, stack);
    }
    async instantiateCustomProvider(module, provider, stack) {
        const token = provider.token;
        const scope = providerScope(provider);
        if (Object.prototype.hasOwnProperty.call(provider, "useValue")) {
            module.instances.set(token, provider.useValue);
            return provider.useValue;
        }
        if (provider.useFactory) {
            const args = await Promise.all((provider.inject ?? []).map((dependency) => this.resolveDependency(module, dependency, stack)));
            const instance = provider.useFactory(...args);
            module.instances.set(token, instance);
            if (scope === "singleton") {
                module.container.register({
                    token: token,
                    useValue: instance,
                });
            }
            return instance;
        }
        if (provider.useClass) {
            return this.instantiateToken(module, token, provider.useClass, stack);
        }
        throw new Error(`Unsupported provider for token: ${tokenName(token)}`);
    }
    async instantiateToken(module, token, ctor, stack) {
        if (module.instances.has(token)) {
            return module.instances.get(token);
        }
        if (stack.has(token)) {
            throw new Error(`Circular provider dependency detected: "${tokenName(token)}"`);
        }
        stack.add(token);
        const scope = providerScope(ctor);
        const instance = await this.construct(module, ctor, stack);
        module.instances.set(token, instance);
        if (scope === "singleton") {
            module.container.register({
                token: token,
                useValue: instance,
            });
        }
        stack.delete(token);
        return instance;
    }
    async construct(module, ctor, stack) {
        const dependencies = this.getConstructorDependencies(module, ctor);
        const args = await Promise.all(dependencies.map((dependency) => this.resolveDependency(module, dependency, stack)));
        return new ctor(...args);
    }
    async resolveDependency(module, dependency, stack) {
        if (this.isLocalToken(module, dependency)) {
            const provider = this.findLocalProvider(module, dependency);
            if (provider) {
                return this.instantiateProvider(module, provider, stack);
            }
            if (typeof dependency === "function") {
                return this.instantiateToken(module, dependency, dependency, stack);
            }
        }
        return module.container.resolve(dependency);
    }
    getConstructorDependencies(module, ctor) {
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
            throw new Error(`Unable to resolve constructor parameter "${name ?? index}" of "${this.getName(ctor)}"`);
        });
    }
    canResolve(module, token) {
        return this.isLocalToken(module, token)
            || module.container.has(token);
    }
    collectKnownTokens(module) {
        return [
            ...module.providers.map(providerToken),
            ...module.controllers,
            ...module.container.tokens(),
        ];
    }
    findLocalProvider(module, token) {
        return module.providers.find((provider) => providerToken(provider) === token);
    }
    isLocalToken(module, token) {
        return module.providers.some((provider) => providerToken(provider) === token) || module.controllers.includes(token);
    }
    getName(target) {
        return target.name || "<anonymous>";
    }
}
//# sourceMappingURL=container-composer.js.map