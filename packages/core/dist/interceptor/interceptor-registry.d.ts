import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";
import type { Interceptor } from "./interceptor.js";
export declare class InterceptorRegistry {
    private readonly container;
    private readonly interceptors;
    constructor(container: Container);
    register<T extends Interceptor>(token: InjectToken<T>): Promise<T>;
    has(token: InjectToken): boolean;
    get<T extends Interceptor>(token: InjectToken<T>): T;
    getAll(): ReadonlyMap<InjectToken, Interceptor>;
    private getTokenName;
}
//# sourceMappingURL=interceptor-registry.d.ts.map