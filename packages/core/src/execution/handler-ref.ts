import type {
    RouteMetadata,
    WebSocketEventMetadata,
} from "@sim-lu/common";
import type { ControllerRef } from "../index.js";

export type HandlerMetadata =
    | {
        type: "http";
        metadata: RouteMetadata;
    }
    | {
        type: "websocket";
        metadata: WebSocketEventMetadata;
    };

export class HandlerRef<TController extends object> {
    public constructor(
        public readonly controller: ControllerRef<TController>,
        public readonly method: string | symbol,
    ) { }

    public invoke(
        args: readonly unknown[] = [],
    ): unknown {
        const handler = this.controller.instance[
            this.method as keyof TController
        ];

        if (typeof handler !== "function") {
            throw new Error(
                `Handler "${String(this.method)}" is not a function`,
            );
        }

        return handler.apply(
            this.controller.instance,
            args,
        );
    }
}