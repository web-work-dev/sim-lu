import { matchPath, pathSpecificity } from "./path.js";
import { RouteExplorer } from "./route-explorer.js";
export class RouteRegistry {
    explorer;
    routes = [];
    constructor(explorer = new RouteExplorer()) {
        this.explorer = explorer;
    }
    registerController(controller) {
        const discovered = this.explorer.explore(controller);
        this.routes.push(...discovered);
        return discovered;
    }
    exploreModules(modules) {
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
    getAll() {
        return this.routes;
    }
    getHttpRoutes() {
        return this.routes.filter((route) => route.type === "http");
    }
    getWebSocketRoutes() {
        return this.routes.filter((route) => route.type === "websocket");
    }
    matchHttp(method, path) {
        return this.matchHttpRequest(method, path)?.route;
    }
    matchHttpRequest(method, path) {
        const candidates = this.getHttpRoutes().filter((route) => route.method === method);
        const exact = candidates.find((route) => route.path === path);
        if (exact) {
            return {
                route: exact,
                params: {},
            };
        }
        let best;
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
    assertUniqueRoutes() {
        const httpKeys = new Set();
        for (const route of this.getHttpRoutes()) {
            const key = `${route.method} ${route.path}`;
            if (httpKeys.has(key)) {
                throw new Error(`Duplicate HTTP route: ${key}`);
            }
            httpKeys.add(key);
        }
        const websocketKeys = new Set();
        for (const route of this.getWebSocketRoutes()) {
            const key = `${route.path} ${route.event}`;
            if (websocketKeys.has(key)) {
                throw new Error(`Duplicate WebSocket route: ${key}`);
            }
            websocketKeys.add(key);
        }
    }
}
//# sourceMappingURL=route-registry.js.map