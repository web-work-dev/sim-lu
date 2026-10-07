import { METADATA_KEYS } from "../metadata/keys.js";
function createWebSocketEventDecorator(event) {
    return (target, propertyKey) => {
        const existingEvents = Reflect.getMetadata(METADATA_KEYS.WEBSOCKET_EVENTS, target.constructor);
        const metadata = {
            event,
            handler: propertyKey,
        };
        const events = [
            ...(existingEvents ?? []),
            metadata,
        ];
        Reflect.defineMetadata(METADATA_KEYS.WEBSOCKET_EVENTS, events, target.constructor);
    };
}
/**
 * Registers a method as a handler for a named WebSocket event.
 *
 * @param event - Event name to listen for.
 */
export function On(event) {
    return createWebSocketEventDecorator(event);
}
/** Registers a method as a handler for the WebSocket `open` event. */
export function OnOpen() {
    return createWebSocketEventDecorator("$open");
}
/** Registers a method as a handler for incoming WebSocket messages. */
export function OnMessage() {
    return createWebSocketEventDecorator("$message");
}
/** Registers a method as a handler for the WebSocket `close` event. */
export function OnClose() {
    return createWebSocketEventDecorator("$close");
}
//# sourceMappingURL=websocket-events.js.map