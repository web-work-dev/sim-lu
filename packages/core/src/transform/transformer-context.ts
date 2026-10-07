import type { ExecutionContext } from "../execution/execution-context.js";

export class TransformerContext<TController extends object = object> {
    public constructor(
        public readonly execution: ExecutionContext<TController>,
    ) { }

    public get handler() {
        return this.execution.handler;
    }

    public get transport() {
        return this.execution.transport;
    }

    public get<T>(key: string): T | undefined {
        return this.execution.get<T>(key);
    }

    public set<T>(key: string, value: T): void {
        this.execution.set(key, value);
    }

    public has(key: string): boolean {
        return this.execution.has(key);
    }

    public delete(key: string): boolean {
        return this.execution.delete(key);
    }

    public getState(): ReadonlyMap<string, unknown> {
        return this.execution.getState();
    }
}
