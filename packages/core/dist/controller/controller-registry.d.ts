import type { InjectToken, Container } from "../index.js";
import { ControllerRef } from "./controller-ref.js";
export declare class ControllerRegistry {
    private readonly container;
    private readonly controllers;
    constructor(container: Container);
    register<T extends object>(token: InjectToken<T>): Promise<ControllerRef<T>>;
    has(token: InjectToken): boolean;
    get<T extends object>(token: InjectToken<T>): ControllerRef<T>;
    getAll(): ReadonlyMap<InjectToken, ControllerRef<object>>;
    private getTokenName;
}
//# sourceMappingURL=controller-registry.d.ts.map