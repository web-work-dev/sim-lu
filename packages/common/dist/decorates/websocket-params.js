import { METADATA_KEYS } from "../metadata/keys.js";
function createWebSocketParameterDecorator(type) {
    return (target, propertyKey, parameterIndex) => {
        const existingParameters = Reflect.getMetadata(METADATA_KEYS.PARAM, target.constructor);
        const metadata = {
            type,
            index: parameterIndex,
            handler: propertyKey,
        };
        const existing = existingParameters ?? [];
        const parameters = [...existing];
        const firstIndexOfHandler = parameters.findIndex(p => p.handler === propertyKey);
        if (firstIndexOfHandler !== -1) {
            parameters.splice(firstIndexOfHandler, 0, metadata);
        }
        else {
            parameters.push(metadata);
        }
        Reflect.defineMetadata(METADATA_KEYS.PARAM, parameters, target.constructor);
    };
}
/** Binds the WebSocket connection object to a handler parameter. */
export function WsSocket() {
    return createWebSocketParameterDecorator("ws-socket");
}
/** Binds an incoming WebSocket message to a handler parameter. */
export function WsMessage() {
    return createWebSocketParameterDecorator("ws-message");
}
/** Binds the WebSocket context to a handler parameter. */
export function WsContext() {
    return createWebSocketParameterDecorator("ws-context");
}
//# sourceMappingURL=websocket-params.js.map