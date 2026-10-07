import type { HttpMethod } from "@sim-lu/common";
import type { ControllerRef } from "../controller/controller-ref.js";
import type { ModuleWrapper } from "../application/module-wrapper.js";
import { RouteExplorer } from "./route-explorer.js";
import type { HttpRouteDefinition, HttpRouteMatch, RouteDefinition, WebSocketRouteDefinition } from "./route-definition.js";
export declare class RouteRegistry {
    private readonly explorer;
    private readonly routes;
    constructor(explorer?: RouteExplorer);
    registerController<TController extends object>(controller: ControllerRef<TController>): readonly RouteDefinition<TController>[];
    exploreModules(modules: readonly ModuleWrapper[]): readonly RouteDefinition[];
    getAll(): readonly RouteDefinition[];
    getHttpRoutes(): readonly HttpRouteDefinition[];
    getWebSocketRoutes(): readonly WebSocketRouteDefinition[];
    matchHttp(method: HttpMethod, path: string): HttpRouteDefinition | undefined;
    matchHttpRequest(method: HttpMethod, path: string): HttpRouteMatch | undefined;
    private assertUniqueRoutes;
}
//# sourceMappingURL=route-registry.d.ts.map