import { METADATA_KEYS } from "../metadata/keys.js";

import type {
    WebSocketEventMetadata,
} from "../metadata/types.js";

function createWebSocketEventDecorator(
    event: string,
): MethodDecorator {
    return (target, propertyKey) => {
        const existingEvents =
            Reflect.getMetadata(
                METADATA_KEYS.WEBSOCKET_EVENTS,
                target.constructor,
            ) as WebSocketEventMetadata[] | undefined;

        const metadata: WebSocketEventMetadata = {
            event,
            handler: propertyKey,
        };

        const events: WebSocketEventMetadata[] = [
            ...(existingEvents ?? []),
            metadata,
        ];

        Reflect.defineMetadata(
            METADATA_KEYS.WEBSOCKET_EVENTS,
            events,
            target.constructor,
        );
    };
}

/**
 * Registers a method as a handler for a named WebSocket event.
 *
 * @param event - Event name to listen for.
 */
export function On(event: string): MethodDecorator {
    return createWebSocketEventDecorator(event);
}

/** Registers a method as a handler for the WebSocket `open` event. */
export function OnOpen(): MethodDecorator {
    return createWebSocketEventDecorator("$open");
}

/** Registers a method as a handler for incoming WebSocket messages. */
export function OnMessage(): MethodDecorator {
    return createWebSocketEventDecorator("$message");
}

/** Registers a method as a handler for the WebSocket `close` event. */
export function OnClose(): MethodDecorator {
    return createWebSocketEventDecorator("$close");
}