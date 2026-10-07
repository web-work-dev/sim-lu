import type { ExecutionContext } from "../execution/execution-context.js";

export class InterceptorContext<TController extends object = object> {
    constructor(
        private readonly executionContext: ExecutionContext<TController>,
    ) { }

    get handler() {
        return this.executionContext.handler;
    }

    get transport() {
        return this.executionContext.transport;
    }

    set<T>(key: string, value: T): void {
        this.executionContext.set(key, value);
    }

    get<T>(key: string): T | undefined {
        return this.executionContext.get<T>(key);
    }

    has(key: string): boolean {
        return this.executionContext.has(key);
    }

    delete(key: string): boolean {
        return this.executionContext.delete(key);
    }

    getState(): ReadonlyMap<string, unknown> {
        return this.executionContext.getState();
    }
}