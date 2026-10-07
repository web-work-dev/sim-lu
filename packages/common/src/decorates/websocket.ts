import { METADATA_KEYS } from "../metadata/keys.js";

import type { WebSocketMetadata } from "../metadata/types.js";

/**
 * Marks a class as a WebSocket gateway (event handler container).
 *
 * @param path - WebSocket endpoint path.
 * @param subprotocol - Optional subprotocol string.
 */
export function WebSocket(
    path = "/",
    subprotocol?: string,
): ClassDecorator {
    return (target) => {
        const metadata: WebSocketMetadata = {
            path,
            ...(subprotocol !== undefined && {
                subprotocol,
            }),
        };

        Reflect.defineMetadata(
            METADATA_KEYS.WEBSOCKET,
            metadata,
            target,
        );
    };
}