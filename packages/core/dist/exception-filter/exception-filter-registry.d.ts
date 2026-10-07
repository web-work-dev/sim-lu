import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";
import type { ExceptionFilter } from "./exception-filter.js";
export declare class ExceptionFilterRegistry {
    private readonly container;
    private readonly filters;
    constructor(container: Container);
    register<T extends ExceptionFilter>(token: InjectToken<T>): Promise<T>;
    has(token: InjectToken): boolean;
    get<T extends ExceptionFilter>(token: InjectToken<T>): T;
    getAll(): ReadonlyMap<InjectToken, ExceptionFilter>;
    private getTokenName;
}
//# sourceMappingURL=exception-filter-registry.d.ts.map