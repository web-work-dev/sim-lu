export class ExceptionFilterContext {
    executionContext;
    exception;
    constructor(executionContext, exception) {
        this.executionContext = executionContext;
        this.exception = exception;
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
//# sourceMappingURL=exception-filter-context.js.map