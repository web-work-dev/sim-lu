import type { HandlerRef } from "./handler-ref.js";

export type ExecutionTransport =
    | "http"
    | "websocket";

export class ExecutionContext<TController extends object = object> {
    private readonly stateStore = new Map<string, unknown>();

    public constructor(
        public readonly handler: HandlerRef<TController>,
        public readonly transport: ExecutionTransport,
    ) { }

    public set<T>(
        key: string,
        value: T,
    ): void {
        this.stateStore.set(key, value);
    }

    public get<T>(
        key: string,
    ): T | undefined {
        return this.stateStore.get(key) as T | undefined;
    }

    public has(
        key: string,
    ): boolean {
        return this.stateStore.has(key);
    }

    public delete(
        key: string,
    ): boolean {
        return this.stateStore.delete(key);
    }

    public getState(): ReadonlyMap<string, unknown> {
        return this.stateStore;
    }
}