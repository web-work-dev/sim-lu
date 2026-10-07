import { METADATA_KEYS, getConstructorDependencies, getConstructorParamNames, isUsableParamType, matchTokenByParamName, } from "@sim-lu/common";
export class Container {
    providers = new Map();
    instances = new Map();
    register(provider) {
        this.providers.set(provider.token, provider);
    }
    async resolve(token) {
        const provider = this.providers.get(token);
        if (!provider) {
            throw new Error(`Provider not found for token: ${this.getTokenName(token)}`);
        }
        const scope = this.getScope(provider);
        if (scope === "request") {
            throw new Error(`Cannot resolve request-scoped provider "${this.getTokenName(token)}" via Container.resolve(). Use a request-scoped container.`);
        }
        if (scope === "singleton") {
            const cached = this.instances.get(token);
            if (cached !== undefined) {
                return cached;
            }
        }
        if (this.isValueProvider(provider)) {
            const value = provider.useValue;
            if (scope === "singleton") {
                this.instances.set(token, value);
            }
            return value;
        }
        if (this.isClassProvider(provider)) {
            const instance = await this.resolveClass(provider.useClass);
            if (scope === "singleton") {
                this.instances.set(token, instance);
            }
            return instance;
        }
        if (this.isFactoryProvider(provider)) {
            const factory = provider;
            const args = (factory.inject ?? []).map((dependency) => this.resolve(dependency));
            const resolvedArgs = await Promise.all(args);
            const instance = factory.useFactory(...resolvedArgs);
            if (scope === "singleton") {
                this.instances.set(token, instance);
            }
            return instance;
        }
        throw new Error(`Unsupported provider for token: ${this.getTokenName(token)}`);
    }
    has(token) {
        return this.providers.has(token);
    }
    tokens() {
        return this.providers.keys();
    }
    getScope(provider) {
        if ("scope" in provider && provider.scope !== undefined) {
            return provider.scope;
        }
        if (this.isClassProvider(provider)) {
            const metadata = Reflect.getMetadata(METADATA_KEYS.INJECTABLE, provider.useClass);
            return metadata?.scope ?? "singleton";
        }
        if (this.isFactoryProvider(provider)) {
            return "transient";
        }
        return "singleton";
    }
    async resolveClass(target) {
        const dependencies = getConstructorDependencies(target);
        const names = getConstructorParamNames(target);
        if (dependencies.length === 0 && names.length === 0) {
            return new target();
        }
        const length = Math.max(dependencies.length, names.length);
        const instances = await Promise.all(Array.from({ length }, (_, index) => this.resolve(this.resolveConstructorToken(dependencies[index], names[index]))));
        return new target(...instances);
    }
    resolveConstructorToken(token, name) {
        if (isUsableParamType(token) && this.has(token)) {
            return token;
        }
        if (name) {
            const matched = matchTokenByParamName(name, this.tokens());
            if (matched !== undefined) {
                return matched;
            }
        }
        if (isUsableParamType(token)) {
            return token;
        }
        throw new Error(`Provider not found for token: ${name || (token == null ? "<unknown>" : this.getTokenName(token))}`);
    }
    isClassProvider(provider) {
        return "useClass" in provider;
    }
    isValueProvider(provider) {
        return "useValue" in provider;
    }
    isFactoryProvider(provider) {
        return "useFactory" in provider;
    }
    getTokenName(token) {
        if (typeof token === "function") {
            return token.name || "<anonymous>";
        }
        if (typeof token === "symbol") {
            return token.toString();
        }
        return token;
    }
}
//# sourceMappingURL=container.js.map