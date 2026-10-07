import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";
import type { Transformer } from "./transformer.js";
export declare class TransformerRegistry {
    private readonly container;
    private readonly transformers;
    constructor(container: Container);
    register<T extends Transformer>(token: InjectToken<T>): Promise<T>;
    has(token: InjectToken): boolean;
    get<T extends Transformer>(token: InjectToken<T>): T;
    getAll(): ReadonlyMap<InjectToken, Transformer>;
    private getTokenName;
}
//# sourceMappingURL=transformer-registry.d.ts.map