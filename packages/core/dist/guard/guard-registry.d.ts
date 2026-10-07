import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";
import type { Guard } from "./guard.js";
export declare class GuardRegistry {
    private readonly container;
    private readonly guards;
    constructor(container: Container);
    register<T extends Guard>(token: InjectToken<T>): Promise<T>;
    has(token: InjectToken): boolean;
    get<T extends Guard>(token: InjectToken<T>): T;
    getAll(): ReadonlyMap<InjectToken, Guard>;
    private getTokenName;
}
//# sourceMappingURL=guard-registry.d.ts.map