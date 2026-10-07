import { ControllerRef } from "./controller-ref.js";
export class ControllerRegistry {
    container;
    controllers = new Map();
    constructor(container) {
        this.container = container;
    }
    async register(token) {
        const instance = await this.container.resolve(token);
        const controller = new ControllerRef(token, instance);
        this.controllers.set(token, controller);
        return controller;
    }
    has(token) {
        return this.controllers.has(token);
    }
    get(token) {
        const controller = this.controllers.get(token);
        if (!controller) {
            throw new Error(`Controller not found for token: ${this.getTokenName(token)}`);
        }
        return controller;
    }
    getAll() {
        return this.controllers;
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
//# sourceMappingURL=controller-registry.js.map