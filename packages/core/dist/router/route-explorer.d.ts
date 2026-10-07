import type { ControllerRef } from "../controller/controller-ref.js";
import type { HttpRouteDefinition, RouteDefinition, WebSocketRouteDefinition } from "./route-definition.js";
export declare class RouteExplorer {
    explore<TController extends object>(controller: ControllerRef<TController>): readonly RouteDefinition<TController>[];
    exploreHttp<TController extends object>(controller: ControllerRef<TController>): readonly HttpRouteDefinition<TController>[];
    exploreWebSocket<TController extends object>(controller: ControllerRef<TController>): readonly WebSocketRouteDefinition<TController>[];
    private getControllerPath;
    private getRouteMetadata;
    private getWebSocketEvents;
    private getWebSocketMetadata;
    private getControllerTarget;
}
//# sourceMappingURL=route-explorer.d.ts.map