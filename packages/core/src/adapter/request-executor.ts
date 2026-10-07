import type { HttpRequest, WebSocketContext, WebSocketSocket } from "@sim-lu/http";
import { isSerializedBody, type SerializedBody } from "@sim-lu/error";

import type { InjectToken } from "../container/token.js";
import { ExecutionContext } from "../execution/execution-context.js";
import type { ExecutionDispatcher } from "../execution/execution-dispatcher.js";
import type {
    HttpRouteDefinition,
    WebSocketRouteDefinition,
} from "../router/route-definition.js";
import type { MutableHttpResponse } from "./http-response.js";

export class RequestExecutor {
    public constructor(
        private readonly getDispatcher: (
            token: InjectToken,
        ) => ExecutionDispatcher,
    ) { }

    public async executeHttp(
        route: HttpRouteDefinition,
        request: HttpRequest,
        response: MutableHttpResponse,
    ): Promise<unknown> {
        const context = new ExecutionContext(route.handler, "http");

        context.set("request", request);
        context.set("response", response);
        context.set("params", request.params);
        context.set("query", request.query);
        context.set("headers", request.headers);
        context.set("cookies", request.cookies);
        context.set("body", request.body);

        const result = await this.getDispatcher(route.controller.token).execute(
            route.handler,
            context,
        );

        if (isSerializedBody(result)) {
            response.setStatus(result.statusCode);

            for (const [name, value] of Object.entries(result.headers)) {
                response.setHeader(name, value);
            }

            response.send(JSON.parse(result.payload) as unknown);

            return result;
        }

        if (result !== undefined && typeof result === "object" && result !== null) {
            const statusCode = (result as { statusCode?: number }).statusCode;

            if (typeof statusCode === "number") {
                response.setStatus(statusCode);
            }
        }

        if (result !== undefined && response.body === undefined) {
            response.send(result);
        }

        return result;
    }

    public async executeWebSocket(
        route: WebSocketRouteDefinition,
        state: Readonly<Record<string, unknown>>,
    ): Promise<unknown> {
        const context = new ExecutionContext(route.handler, "websocket");

        for (const [key, value] of Object.entries(state)) {
            context.set(key, value);
        }

        const wsContext = this.buildWsContext(context);

        if (wsContext) {
            context.set("ws.context", wsContext);
        }

        return this.getDispatcher(route.controller.token).execute(
            route.handler,
            context,
        );
    }

    private buildWsContext(
        context: ExecutionContext,
    ): WebSocketContext | undefined {
        const socket = context.get<WebSocketSocket>("ws.socket");

        if (!socket) {
            return undefined;
        }

        return {
            socket,
            params: context.get<Record<string, string | string[] | undefined>>("ws.params") ?? {},
            query: context.get<Record<string, string | string[] | undefined>>("ws.query") ?? {},
            headers: context.get<Record<string, string | string[] | undefined>>("ws.headers") ?? {},
            cookies: context.get<Record<string, string | undefined>>("ws.cookies") ?? {},
            state: context.get<Map<string, unknown>>("ws.state") ?? new Map<string, unknown>(),
        };
    }
}
