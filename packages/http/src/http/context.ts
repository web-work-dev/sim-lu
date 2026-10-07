import type { HttpRequest } from "./request.js";
import type { HttpResponse } from "./response.js";

export type ExecutionType =
    | "http"
    | "websocket";

export interface ExecutionContext<TRequest = unknown, TResponse = unknown> {
    readonly type: ExecutionType;

    readonly request: TRequest;
    readonly response: TResponse;

    readonly controller: Function;
    readonly handler: string | symbol;

    readonly state: Map<string, unknown>;
}