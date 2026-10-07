import { METADATA_KEYS } from "../metadata/keys.js";
/**
 * Marks a class as a WebSocket gateway (event handler container).
 *
 * @param path - WebSocket endpoint path.
 * @param subprotocol - Optional subprotocol string.
 */
export function WebSocket(path = "/", subprotocol) {
    return (target) => {
        const metadata = {
            path,
            ...(subprotocol !== undefined && {
                subprotocol,
            }),
        };
        Reflect.defineMetadata(METADATA_KEYS.WEBSOCKET, metadata, target);
    };
}
//# sourceMappingURL=websocket.js.map