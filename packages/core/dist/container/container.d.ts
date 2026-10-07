import type { InjectToken } from "./token.js";
import type { Provider } from "./provider.js";
export declare class Container {
    private readonly providers;
    private readonly instances;
    register<T>(provider: Provider<T>): void;
    resolve<T>(token: InjectToken<T>): Promise<T>;
    has(token: InjectToken): boolean;
    tokens(): Iterable<InjectToken>;
    private getScope;
    private resolveClass;
    private resolveConstructorToken;
    private isClassProvider;
    private isValueProvider;
    private isFactoryProvider;
    private getTokenName;
}
//# sourceMappingURL=container.d.ts.map