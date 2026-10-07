import {
    METADATA_KEYS,
    getConstructorDependencies,
    getConstructorParamNames,
    isUsableParamType,
    matchTokenByParamName,
    type ProviderScope,
    type ProviderToken,
} from "@sim-lu/common";

import type { InjectToken } from "./token.js";
import type {
    ClassProvider,
    FactoryProvider,
    Provider,
    ValueProvider,
} from "./provider.js";

export class Container {
    private readonly providers = new Map<
        InjectToken,
        Provider
    >();

    private readonly instances = new Map<InjectToken, unknown>();

    public register<T>(
        provider: Provider<T>,
    ): void {
        this.providers.set(provider.token, provider);
    }

    public async resolve<T>(
        token: InjectToken<T>,
    ): Promise<T> {
        const provider = this.providers.get(token);

        if (!provider) {
            throw new Error(
                `Provider not found for token: ${this.getTokenName(token)}`,
            );
        }

        const scope = this.getScope(provider);

        if (scope === "request") {
            throw new Error(
                `Cannot resolve request-scoped provider "${this.getTokenName(token)}" via Container.resolve(). Use a request-scoped container.`,
            );
        }

        if (scope === "singleton") {
            const cached = this.instances.get(token);

            if (cached !== undefined) {
                return cached as T;
            }
        }

        if (this.isValueProvider(provider)) {
            const value = (provider as ValueProvider<T>).useValue;
            if (scope === "singleton") {
                this.instances.set(token, value);
            }
            return value;
        }

        if (this.isClassProvider(provider)) {
            const instance = await this.resolveClass(
                (provider as ClassProvider<T>).useClass,
            );

            if (scope === "singleton") {
                this.instances.set(token, instance);
            }

            return instance;
        }

        if (this.isFactoryProvider(provider)) {
            const factory = provider as FactoryProvider<T>;
            const args = (factory.inject ?? []).map(
                (dependency) => this.resolve(dependency),
            );

            const resolvedArgs = await Promise.all(args);
            const instance = factory.useFactory(...resolvedArgs) as T;

            if (scope === "singleton") {
                this.instances.set(token, instance);
            }

            return instance;
        }

        throw new Error(
            `Unsupported provider for token: ${this.getTokenName(token)}`,
        );
    }

    public has(
        token: InjectToken,
    ): boolean {
        return this.providers.has(token);
    }

    public tokens(): Iterable<InjectToken> {
        return this.providers.keys();
    }

    private getScope(
        provider: Provider,
    ): ProviderScope {
        if ("scope" in provider && provider.scope !== undefined) {
            return provider.scope;
        }

        if (this.isClassProvider(provider)) {
            const metadata = Reflect.getMetadata(
                METADATA_KEYS.INJECTABLE,
                provider.useClass,
            ) as { scope?: ProviderScope } | undefined;

            return metadata?.scope ?? "singleton";
        }

        if (this.isFactoryProvider(provider)) {
            return "transient";
        }

        return "singleton";
    }

    private async resolveClass<T>(
        target: new (...args: any[]) => T,
    ): Promise<T> {
        const dependencies = getConstructorDependencies(target);
        const names = getConstructorParamNames(target);

        if (dependencies.length === 0 && names.length === 0) {
            return new target();
        }

        const length = Math.max(dependencies.length, names.length);
        const instances = await Promise.all(
            Array.from({ length }, (_, index) =>
                this.resolve(
                    this.resolveConstructorToken(
                        dependencies[index],
                        names[index],
                    ),
                ),
            ),
        );

        return new target(...instances);
    }

    private resolveConstructorToken(
        token: ProviderToken | undefined,
        name: string | undefined,
    ): InjectToken {
        if (isUsableParamType(token) && this.has(token as InjectToken)) {
            return token as InjectToken;
        }

        if (name) {
            const matched = matchTokenByParamName(name, this.tokens());

            if (matched !== undefined) {
                return matched as InjectToken;
            }
        }

        if (isUsableParamType(token)) {
            return token as InjectToken;
        }

        throw new Error(
            `Provider not found for token: ${name || (token == null ? "<unknown>" : this.getTokenName(token as unknown as InjectToken))}`,
        );
    }

    private isClassProvider(
        provider: Provider,
    ): provider is ClassProvider {
        return "useClass" in provider;
    }

    private isValueProvider(
        provider: Provider,
    ): provider is ValueProvider {
        return "useValue" in provider;
    }

    private isFactoryProvider(
        provider: Provider,
    ): provider is FactoryProvider {
        return "useFactory" in provider;
    }

    private getTokenName(
        token: InjectToken,
    ): string {
        if (typeof token === "function") {
            return token.name || "<anonymous>";
        }

        if (typeof token === "symbol") {
            return token.toString();
        }

        return token;
    }
}
