import {
    METADATA_KEYS,
    type ControllerMetadata,
    type RouteMetadata,
    type WebSocketEventMetadata,
    type WebSocketMetadata,
} from "@sim-lu/common";

import type { ControllerRef } from "../controller/controller-ref.js";
import { HandlerRef } from "../execution/handler-ref.js";
import { joinPaths } from "./path.js";
import type {
    HttpRouteDefinition,
    RouteDefinition,
    WebSocketRouteDefinition,
} from "./route-definition.js";

export class RouteExplorer {
    public explore<TController extends object>(
        controller: ControllerRef<TController>,
    ): readonly RouteDefinition<TController>[] {
        return [
            ...this.exploreHttp(controller),
            ...this.exploreWebSocket(controller),
        ];
    }

    public exploreHttp<TController extends object>(
        controller: ControllerRef<TController>,
    ): readonly HttpRouteDefinition<TController>[] {
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

    public exploreWebSocket<TController extends object>(
        controller: ControllerRef<TController>,
    ): readonly WebSocketRouteDefinition<TController>[] {
        const events = this.getWebSocketEvents(controller);

        if (events.length === 0) {
            return [];
        }

        const gateway = this.getWebSocketMetadata(controller);
        const path = gateway?.path ?? this.getControllerPath(controller);

        return events.map((metadata) => {
            const definition: WebSocketRouteDefinition<TController> = {
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

    private getControllerPath<TController extends object>(
        controller: ControllerRef<TController>,
    ): string {
        const metadata = Reflect.getMetadata(
            METADATA_KEYS.CONTROLLER,
            this.getControllerTarget(controller),
        ) as ControllerMetadata | undefined;

        return metadata?.path ?? "";
    }

    private getRouteMetadata<TController extends object>(
        controller: ControllerRef<TController>,
    ): readonly RouteMetadata[] {
        const routes = Reflect.getMetadata(
            METADATA_KEYS.ROUTES,
            this.getControllerTarget(controller),
        ) as RouteMetadata[] | undefined;

        return routes ?? [];
    }

    private getWebSocketEvents<TController extends object>(
        controller: ControllerRef<TController>,
    ): readonly WebSocketEventMetadata[] {
        const events = Reflect.getMetadata(
            METADATA_KEYS.WEBSOCKET_EVENTS,
            this.getControllerTarget(controller),
        ) as WebSocketEventMetadata[] | undefined;

        return events ?? [];
    }

    private getWebSocketMetadata<TController extends object>(
        controller: ControllerRef<TController>,
    ): WebSocketMetadata | undefined {
        return Reflect.getMetadata(
            METADATA_KEYS.WEBSOCKET,
            this.getControllerTarget(controller),
        ) as WebSocketMetadata | undefined;
    }

    private getControllerTarget<TController extends object>(
        controller: ControllerRef<TController>,
    ): Function {
        if (typeof controller.token === "function") {
            return controller.token;
        }

        return controller.instance.constructor;
    }
}
