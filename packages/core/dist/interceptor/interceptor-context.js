export class InterceptorContext {
    executionContext;
    constructor(executionContext) {
        this.executionContext = executionContext;
    }
    get handler() {
        return this.executionContext.handler;
    }
    get transport() {
        return this.executionContext.transport;
    }
    set(key, value) {
        this.executionContext.set(key, value);
    }
    get(key) {
        return this.executionContext.get(key);
    }
    has(key) {
        return this.executionContext.has(key);
    }
    delete(key) {
        return this.executionContext.delete(key);
    }
    getState() {
        return this.executionContext.getState();
    }
}
//# sourceMappingURL=interceptor-context.js.map