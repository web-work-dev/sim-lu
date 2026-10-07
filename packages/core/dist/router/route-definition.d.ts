import type { HttpMethod, RouteMetadata, WebSocketEventMetadata, WebSocketMetadata } from "@sim-lu/common";
import type { ControllerRef } from "../controller/controller-ref.js";
import type { HandlerRef } from "../execution/handler-ref.js";
export interface HttpRouteDefinition<TController extends object = object> {
    readonly type: "http";
    readonly method: HttpMethod;
    readonly path: string;
    readonly controllerPath: string;
    readonly routePath: string;
    readonly handler: HandlerRef<TController>;
    readonly controller: ControllerRef<TController>;
    readonly metadata: RouteMetadata;
}
export interface HttpRouteMatch<TController extends object = object> {
    readonly route: HttpRouteDefinition<TController>;
    readonly params: Readonly<Record<string, string | string[] | undefined>>;
}
export interface WebSocketRouteDefinition<TController extends object = object> {
    readonly type: "websocket";
    readonly path: string;
    readonly event: string;
    readonly handler: HandlerRef<TController>;
    readonly controller: ControllerRef<TController>;
    readonly metadata: WebSocketEventMetadata;
    readonly gateway?: WebSocketMetadata;
}
export type RouteDefinition<TController extends object = object> = HttpRouteDefinition<TController> | WebSocketRouteDefinition<TController>;
//# sourceMappingURL=route-definition.d.ts.map