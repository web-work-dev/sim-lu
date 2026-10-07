export class ExecutionContext {
    handler;
    transport;
    stateStore = new Map();
    constructor(handler, transport) {
        this.handler = handler;
        this.transport = transport;
    }
    set(key, value) {
        this.stateStore.set(key, value);
    }
    get(key) {
        return this.stateStore.get(key);
    }
    has(key) {
        return this.stateStore.has(key);
    }
    delete(key) {
        return this.stateStore.delete(key);
    }
    getState() {
        return this.stateStore;
    }
}
//# sourceMappingURL=execution-context.js.map