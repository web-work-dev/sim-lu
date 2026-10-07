import {
    METADATA_KEYS,
    type RouteMetadata,
    type WebSocketEventMetadata,
} from "@sim-lu/common";

import type { ControllerRef } from "../index.js";
import { HandlerRef } from "./handler-ref.js";

export class HandlerResolver {
    public resolveHttpHandlers<TController extends object>(
        controller: ControllerRef<TController>,
    ): readonly HandlerRef<TController>[] {
        const routes = Reflect.getMetadata(
            METADATA_KEYS.ROUTES,
            controller.instance.constructor,
        ) as RouteMetadata[] | undefined;

        if (!routes) {
            return [];
        }

        return routes.map(
            (route) =>
                new HandlerRef(
                    controller,
                    route.handler,
                ),
        );
    }

    public resolveWebSocketHandlers<TController extends object>(
        controller: ControllerRef<TController>,
    ): readonly HandlerRef<TController>[] {
        const events = Reflect.getMetadata(
            METADATA_KEYS.WEBSOCKET_EVENTS,
            controller.instance.constructor,
        ) as WebSocketEventMetadata[] | undefined;

        if (!events) {
            return [];
        }

        return events.map(
            (event) =>
                new HandlerRef(
                    controller,
                    event.handler,
                ),
        );
    }
}