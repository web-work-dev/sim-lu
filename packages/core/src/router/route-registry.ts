import type { HttpMethod } from "@sim-lu/common";

import type { ControllerRef } from "../controller/controller-ref.js";
import type { ModuleWrapper } from "../application/module-wrapper.js";
import { matchPath, pathSpecificity } from "./path.js";
import { RouteExplorer } from "./route-explorer.js";
import type {
    HttpRouteDefinition,
    HttpRouteMatch,
    RouteDefinition,
    WebSocketRouteDefinition,
} from "./route-definition.js";

export class RouteRegistry {
    private readonly routes: RouteDefinition[] = [];

    public constructor(
        private readonly explorer = new RouteExplorer(),
    ) { }

    public registerController<TController extends object>(
        controller: ControllerRef<TController>,
    ): readonly RouteDefinition<TController>[] {
        const discovered = this.explorer.explore(controller);

        this.routes.push(...discovered);

        return discovered;
    }

    public exploreModules(
        modules: readonly ModuleWrapper[],
    ): readonly RouteDefinition[] {
        for (const module of modules) {
            const registry = module.controllerRegistry;

            if (!registry) {
                continue;
            }

            for (const controller of registry.getAll().values()) {
                this.registerController(controller);
            }
        }

        this.assertUniqueRoutes();

        return this.routes;
    }

    public getAll(): readonly RouteDefinition[] {
        return this.routes;
    }

    public getHttpRoutes(): readonly HttpRouteDefinition[] {
        return this.routes.filter(
            (route): route is HttpRouteDefinition => route.type === "http",
        );
    }

    public getWebSocketRoutes(): readonly WebSocketRouteDefinition[] {
        return this.routes.filter(
            (route): route is WebSocketRouteDefinition => route.type === "websocket",
        );
    }

    public matchHttp(
        method: HttpMethod,
        path: string,
    ): HttpRouteDefinition | undefined {
        return this.matchHttpRequest(method, path)?.route;
    }

    public matchHttpRequest(
        method: HttpMethod,
        path: string,
    ): HttpRouteMatch | undefined {
        const candidates = this.getHttpRoutes().filter(
            (route) => route.method === method,
        );

        const exact = candidates.find((route) => route.path === path);

        if (exact) {
            return {
                route: exact,
                params: {},
            };
        }

        let best: HttpRouteMatch | undefined;
        let bestScore = -1;

        for (const route of candidates) {
            const params = matchPath(route.path, path);

            if (!params) {
                continue;
            }

            const score = pathSpecificity(route.path);

            if (score > bestScore) {
                bestScore = score;
                best = {
                    route,
                    params,
                };
            }
        }

        return best;
    }

    private assertUniqueRoutes(): void {
        const httpKeys = new Set<string>();

        for (const route of this.getHttpRoutes()) {
            const key = `${route.method} ${route.path}`;

            if (httpKeys.has(key)) {
                throw new Error(`Duplicate HTTP route: ${key}`);
            }

            httpKeys.add(key);
        }

        const websocketKeys = new Set<string>();

        for (const route of this.getWebSocketRoutes()) {
            const key = `${route.path} ${route.event}`;

            if (websocketKeys.has(key)) {
                throw new Error(`Duplicate WebSocket route: ${key}`);
            }

            websocketKeys.add(key);
        }
    }
}
