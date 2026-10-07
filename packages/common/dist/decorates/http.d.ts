import type { HttpMethod } from "../interfaces/methods.js";
/**
 * Route decorator factory that registers a method as an HTTP handler.
 *
 * @param method - HTTP method (GET, POST, etc.).
 * @param path - Route path (relative to the controller prefix).
 */
export declare function Route(method: HttpMethod, path?: string): MethodDecorator;
/** HTTP GET method route handler. */
export declare const Get: (path?: string) => MethodDecorator;
/** HTTP POST method route handler. */
export declare const Post: (path?: string) => MethodDecorator;
/** HTTP PUT method route handler. */
export declare const Put: (path?: string) => MethodDecorator;
/** HTTP DELETE method route handler. */
export declare const Delete: (path?: string) => MethodDecorator;
/** HTTP PATCH method route handler. */
export declare const Patch: (path?: string) => MethodDecorator;
/** HTTP TRACE method route handler. */
export declare const Trace: (path?: string) => MethodDecorator;
/** HTTP CONNECT method route handler. */
export declare const Connect: (path?: string) => MethodDecorator;
/** HTTP OPTIONS method route handler. */
export declare const Options: (path?: string) => MethodDecorator;
/** HTTP HEAD method route handler. */
export declare const Head: (path?: string) => MethodDecorator;
//# sourceMappingURL=http.d.ts.map