/**
 * Registers a method as a handler for a named WebSocket event.
 *
 * @param event - Event name to listen for.
 */
export declare function On(event: string): MethodDecorator;
/** Registers a method as a handler for the WebSocket `open` event. */
export declare function OnOpen(): MethodDecorator;
/** Registers a method as a handler for incoming WebSocket messages. */
export declare function OnMessage(): MethodDecorator;
/** Registers a method as a handler for the WebSocket `close` event. */
export declare function OnClose(): MethodDecorator;
//# sourceMappingURL=websocket-events.d.ts.map