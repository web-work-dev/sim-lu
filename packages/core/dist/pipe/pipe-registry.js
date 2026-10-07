export class PipeRegistry {
    container;
    pipes = new Map();
    constructor(container) {
        this.container = container;
    }
    async register(token) {
        const pipe = await this.container.resolve(token);
        this.pipes.set(token, pipe);
        return pipe;
    }
    has(token) {
        return this.pipes.has(token);
    }
    get(token) {
        const pipe = this.pipes.get(token);
        if (!pipe) {
            throw new Error(`Pipe not found for token: ${this.getTokenName(token)}`);
        }
        return pipe;
    }
    getAll() {
        return this.pipes;
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
//# sourceMappingURL=pipe-registry.js.map