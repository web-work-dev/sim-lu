import { METADATA_KEYS, } from "@sim-lu/common";
import { HandlerRef } from "../execution/handler-ref.js";
import { joinPaths } from "./path.js";
export class RouteExplorer {
    explore(controller) {
        return [
            ...this.exploreHttp(controller),
            ...this.exploreWebSocket(controller),
        ];
    }
    exploreHttp(controller) {
        const controllerPath = this.getControllerPath(controller);
        const routes = this.getRouteMetadata(controller);
        return routes.map((metadata) => ({
            type: "http",
            method: metadata.method,
            path: joinPaths(controllerPath, metadata.path),
            controllerPath,
            routePath: metadata.path,
            handler: new HandlerRef(controller, metadata.handler),
            controller,
            metadata,
        }));
    }
    exploreWebSocket(controller) {
        const events = this.getWebSocketEvents(controller);
        if (events.length === 0) {
            return [];
        }
        const gateway = this.getWebSocketMetadata(controller);
        const path = gateway?.path ?? this.getControllerPath(controller);
        return events.map((metadata) => {
            const definition = {
                type: "websocket",
                path: joinPaths(path),
                event: metadata.event,
                handler: new HandlerRef(controller, metadata.handler),
                controller,
                metadata,
            };
            if (gateway !== undefined) {
                return {
                    ...definition,
                    gateway,
                };
            }
            return definition;
        });
    }
    getControllerPath(controller) {
        const metadata = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, this.getControllerTarget(controller));
        return metadata?.path ?? "";
    }
    getRouteMetadata(controller) {
        const routes = Reflect.getMetadata(METADATA_KEYS.ROUTES, this.getControllerTarget(controller));
        return routes ?? [];
    }
    getWebSocketEvents(controller) {
        const events = Reflect.getMetadata(METADATA_KEYS.WEBSOCKET_EVENTS, this.getControllerTarget(controller));
        return events ?? [];
    }
    getWebSocketMetadata(controller) {
        return Reflect.getMetadata(METADATA_KEYS.WEBSOCKET, this.getControllerTarget(controller));
    }
    getControllerTarget(controller) {
        if (typeof controller.token === "function") {
            return controller.token;
        }
        return controller.instance.constructor;
    }
}
//# sourceMappingURL=route-explorer.js.map