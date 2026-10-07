export class InterceptorRegistry {
    container;
    interceptors = new Map();
    constructor(container) {
        this.container = container;
    }
    async register(token) {
        const interceptor = await this.container.resolve(token);
        this.interceptors.set(token, interceptor);
        return interceptor;
    }
    has(token) {
        return this.interceptors.has(token);
    }
    get(token) {
        const interceptor = this.interceptors.get(token);
        if (!interceptor) {
            throw new Error(`Interceptor not found for token: ${this.getTokenName(token)}`);
        }
        return interceptor;
    }
    getAll() {
        return this.interceptors;
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
//# sourceMappingURL=interceptor-registry.js.map