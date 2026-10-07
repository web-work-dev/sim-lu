import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";
import type { Pipe } from "./pipe.js";
export declare class PipeRegistry {
    private readonly container;
    private readonly pipes;
    constructor(container: Container);
    register<T extends Pipe>(token: InjectToken<T>): Promise<T>;
    has(token: InjectToken): boolean;
    get<T extends Pipe>(token: InjectToken<T>): T;
    getAll(): ReadonlyMap<InjectToken, Pipe>;
    private getTokenName;
}
//# sourceMappingURL=pipe-registry.d.ts.map