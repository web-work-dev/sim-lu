export class ModuleRef {
    container;
    constructor(container) {
        this.container = container;
    }
    async resolve(token) {
        return this.container.resolve(token);
    }
    async get(token) {
        return this.resolve(token);
    }
    has(token) {
        return this.container.has(token);
    }
}
//# sourceMappingURL=module-ref.js.map