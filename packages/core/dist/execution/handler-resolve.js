import { METADATA_KEYS, } from "@sim-lu/common";
import { HandlerRef } from "./handler-ref.js";
export class HandlerResolver {
    resolveHttpHandlers(controller) {
        const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, controller.instance.constructor);
        if (!routes) {
            return [];
        }
        return routes.map((route) => new HandlerRef(controller, route.handler));
    }
    resolveWebSocketHandlers(controller) {
        const events = Reflect.getMetadata(METADATA_KEYS.WEBSOCKET_EVENTS, controller.instance.constructor);
        if (!events) {
            return [];
        }
        return events.map((event) => new HandlerRef(controller, event.handler));
    }
}
//# sourceMappingURL=handler-resolve.js.map