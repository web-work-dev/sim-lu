export class TransformerRegistry {
    container;
    transformers = new Map();
    constructor(container) {
        this.container = container;
    }
    async register(token) {
        const transformer = await this.container.resolve(token);
        this.transformers.set(token, transformer);
        return transformer;
    }
    has(token) {
        return this.transformers.has(token);
    }
    get(token) {
        const transformer = this.transformers.get(token);
        if (!transformer) {
            throw new Error(`Transformer not found for token: ${this.getTokenName(token)}`);
        }
        return transformer;
    }
    getAll() {
        return this.transformers;
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
//# sourceMappingURL=transformer-registry.js.map