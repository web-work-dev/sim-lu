export class TransformerContext {
    execution;
    constructor(execution) {
        this.execution = execution;
    }
    get handler() {
        return this.execution.handler;
    }
    get transport() {
        return this.execution.transport;
    }
    get(key) {
        return this.execution.get(key);
    }
    set(key, value) {
        this.execution.set(key, value);
    }
    has(key) {
        return this.execution.has(key);
    }
    delete(key) {
        return this.execution.delete(key);
    }
    getState() {
        return this.execution.getState();
    }
}
//# sourceMappingURL=transformer-context.js.map