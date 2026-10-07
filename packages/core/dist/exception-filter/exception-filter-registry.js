export class ExceptionFilterRegistry {
    container;
    filters = new Map();
    constructor(container) {
        this.container = container;
    }
    async register(token) {
        const filter = await this.container.resolve(token);
        this.filters.set(token, filter);
        return filter;
    }
    has(token) {
        return this.filters.has(token);
    }
    get(token) {
        const filter = this.filters.get(token);
        if (!filter) {
            throw new Error(`Exception filter not found for token: ${this.getTokenName(token)}`);
        }
        return filter;
    }
    getAll() {
        return this.filters;
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
//# sourceMappingURL=exception-filter-registry.js.map