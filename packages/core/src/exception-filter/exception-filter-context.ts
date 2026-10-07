import type { ExecutionContext } from "../execution/execution-context.js";

export class ExceptionFilterContext<TController extends object = object> {
    public constructor(
        private readonly executionContext: ExecutionContext<TController>,
        public readonly exception: unknown,
    ) { }

    public get handler() {
        return this.executionContext.handler;
    }

    public get transport() {
        return this.executionContext.transport;
    }

    public set<T>(key: string, value: T): void {
        this.executionContext.set(key, value);
    }

    public get<T>(key: string): T | undefined {
        return this.executionContext.get<T>(key);
    }

    public has(key: string): boolean {
        return this.executionContext.has(key);
    }

    public delete(key: string): boolean {
        return this.executionContext.delete(key);
    }

    public getState(): ReadonlyMap<string, unknown> {
        return this.executionContext.getState();
    }
}
