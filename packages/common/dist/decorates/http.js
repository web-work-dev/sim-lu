import { METADATA_KEYS } from "../metadata/keys.js";
/**
 * Route decorator factory that registers a method as an HTTP handler.
 *
 * @param method - HTTP method (GET, POST, etc.).
 * @param path - Route path (relative to the controller prefix).
 */
export function Route(method, path = "/") {
    return (target, propertyKey, _descriptor) => {
        const existingRoutes = Reflect.getMetadata(METADATA_KEYS.ROUTES, target.constructor);
        const routeMetadata = {
            method,
            path,
            handler: propertyKey,
        };
        const routes = [
            ...(existingRoutes ?? []),
            routeMetadata,
        ];
        Reflect.defineMetadata(METADATA_KEYS.ROUTES, routes, target.constructor);
    };
}
/** HTTP GET method route handler. */
export const Get = (path = "/") => Route("GET", path);
/** HTTP POST method route handler. */
export const Post = (path = "/") => Route("POST", path);
/** HTTP PUT method route handler. */
export const Put = (path = "/") => Route("PUT", path);
/** HTTP DELETE method route handler. */
export const Delete = (path = "/") => Route("DELETE", path);
/** HTTP PATCH method route handler. */
export const Patch = (path = "/") => Route("PATCH", path);
/** HTTP TRACE method route handler. */
export const Trace = (path = "/") => Route("TRACE", path);
/** HTTP CONNECT method route handler. */
export const Connect = (path = "/") => Route("CONNECT", path);
/** HTTP OPTIONS method route handler. */
export const Options = (path = "/") => Route("OPTIONS", path);
/** HTTP HEAD method route handler. */
export const Head = (path = "/") => Route("HEAD", path);
//# sourceMappingURL=http.js.map