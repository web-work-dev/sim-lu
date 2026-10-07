import { isSerializedBody } from "@sim-lu/error";
import { ExecutionContext } from "../execution/execution-context.js";
export class RequestExecutor {
    getDispatcher;
    constructor(getDispatcher) {
        this.getDispatcher = getDispatcher;
    }
    async executeHttp(route, request, response) {
        const context = new ExecutionContext(route.handler, "http");
        context.set("request", request);
        context.set("response", response);
        context.set("params", request.params);
        context.set("query", request.query);
        context.set("headers", request.headers);
        context.set("cookies", request.cookies);
        context.set("body", request.body);
        const result = await this.getDispatcher(route.controller.token).execute(route.handler, context);
        if (isSerializedBody(result)) {
            response.setStatus(result.statusCode);
            for (const [name, value] of Object.entries(result.headers)) {
                response.setHeader(name, value);
            }
            response.send(JSON.parse(result.payload));
            return result;
        }
        if (result !== undefined && typeof result === "object" && result !== null) {
            const statusCode = result.statusCode;
            if (typeof statusCode === "number") {
                response.setStatus(statusCode);
            }
        }
        if (result !== undefined && response.body === undefined) {
            response.send(result);
        }
        return result;
    }
    async executeWebSocket(route, state) {
        const context = new ExecutionContext(route.handler, "websocket");
        for (const [key, value] of Object.entries(state)) {
            context.set(key, value);
        }
        const wsContext = this.buildWsContext(context);
        if (wsContext) {
            context.set("ws.context", wsContext);
        }
        return this.getDispatcher(route.controller.token).execute(route.handler, context);
    }
    buildWsContext(context) {
        const socket = context.get("ws.socket");
        if (!socket) {
            return undefined;
        }
        return {
            socket,
            params: context.get("ws.params") ?? {},
            query: context.get("ws.query") ?? {},
            headers: context.get("ws.headers") ?? {},
            cookies: context.get("ws.cookies") ?? {},
            state: context.get("ws.state") ?? new Map(),
        };
    }
}
//# sourceMappingURL=request-executor.js.map