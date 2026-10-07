export class GuardContext {
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
    getState() {
        return this.execution.getState();
    }
}
//# sourceMappingURL=guard-context.js.map