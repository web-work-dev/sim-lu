import { METADATA_KEYS } from "../metadata/keys.js";

import type {
    ParameterMetadata,
    ParameterType,
} from "../metadata/types.js";

function createWebSocketParameterDecorator(
    type: ParameterType,
): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        const existingParameters =
            Reflect.getMetadata(
                METADATA_KEYS.PARAM,
                target.constructor,
            ) as ParameterMetadata[] | undefined;

        const metadata: ParameterMetadata = {
            type,
            index: parameterIndex,
            handler: propertyKey as string | symbol,
        };

        const existing = existingParameters ?? [];
        const parameters = [...existing];
        const firstIndexOfHandler = parameters.findIndex(p => p.handler === propertyKey);

        if (firstIndexOfHandler !== -1) {
            parameters.splice(firstIndexOfHandler, 0, metadata);
        } else {
            parameters.push(metadata);
        }

        Reflect.defineMetadata(
            METADATA_KEYS.PARAM,
            parameters,
            target.constructor,
        );
    };
}

/** Binds the WebSocket connection object to a handler parameter. */
export function WsSocket(): ParameterDecorator {
    return createWebSocketParameterDecorator("ws-socket");
}

/** Binds an incoming WebSocket message to a handler parameter. */
export function WsMessage(): ParameterDecorator {
    return createWebSocketParameterDecorator("ws-message");
}

/** Binds the WebSocket context to a handler parameter. */
export function WsContext(): ParameterDecorator {
    return createWebSocketParameterDecorator("ws-context");
}