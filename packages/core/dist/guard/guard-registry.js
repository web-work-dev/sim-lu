export class GuardRegistry {
    container;
    guards = new Map();
    constructor(container) {
        this.container = container;
    }
    async register(token) {
        const guard = await this.container.resolve(token);
        this.guards.set(token, guard);
        return guard;
    }
    has(token) {
        return this.guards.has(token);
    }
    get(token) {
        const guard = this.guards.get(token);
        if (!guard) {
            throw new Error(`Guard not found for token: ${this.getTokenName(token)}`);
        }
        return guard;
    }
    getAll() {
        return this.guards;
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
//# sourceMappingURL=guard-registry.js.map