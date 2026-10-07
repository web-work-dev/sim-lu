import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";
export declare class ModuleRef {
    private readonly container;
    constructor(container: Container);
    resolve<T>(token: InjectToken<T>): Promise<T>;
    get<T>(token: InjectToken<T>): Promise<T>;
    has(token: InjectToken): boolean;
}
//# sourceMappingURL=module-ref.d.ts.map