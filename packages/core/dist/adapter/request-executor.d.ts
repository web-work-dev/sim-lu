import type { HttpRequest } from "@sim-lu/http";
import type { InjectToken } from "../container/token.js";
import type { ExecutionDispatcher } from "../execution/execution-dispatcher.js";
import type { HttpRouteDefinition, WebSocketRouteDefinition } from "../router/route-definition.js";
import type { MutableHttpResponse } from "./http-response.js";
export declare class RequestExecutor {
    private readonly getDispatcher;
    constructor(getDispatcher: (token: InjectToken) => ExecutionDispatcher);
    executeHttp(route: HttpRouteDefinition, request: HttpRequest, response: MutableHttpResponse): Promise<unknown>;
    executeWebSocket(route: WebSocketRouteDefinition, state: Readonly<Record<string, unknown>>): Promise<unknown>;
    private buildWsContext;
}
//# sourceMappingURL=request-executor.d.ts.map