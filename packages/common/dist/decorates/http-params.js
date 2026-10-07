import { METADATA_KEYS, } from "../metadata/index.js";
function createHttpParameterDecorator(type, name) {
    return (target, propertyKey, parameterIndex) => {
        if (propertyKey === undefined) {
            throw new Error("Parameter decorators can only be applied to method parameters");
        }
        const existingParameters = Reflect.getMetadata(METADATA_KEYS.PARAM, target.constructor);
        const metadata = name !== undefined
            ? { type, index: parameterIndex, name, handler: propertyKey }
            : { type, index: parameterIndex, handler: propertyKey };
        const parameters = [...(existingParameters ?? [])];
        parameters.push(metadata);
        Reflect.defineMetadata(METADATA_KEYS.PARAM, parameters, target.constructor);
    };
}
/**
 * Binds a route parameter to a controller method parameter.
 *
 * When applied to a route parameter (e.g. `/users/:id`), this decorator extracts
 * the matching value from the route parameters. If `name` is provided, it looks up
 * `params[name]`; otherwise it passes the entire `params` object.
 *
 * @param name - Optional parameter name to extract from route params.
 */
export function Param(name) {
    return createHttpParameterDecorator("param", name);
}
/**
 * Binds a query string parameter to a controller method parameter.
 *
 * When `name` is provided, it extracts `query[name]`. Otherwise it passes
 * the entire query object. Supports default values via parameter default
 * syntax (`@Query("page") page = "1"`).
 *
 * @param name - Optional query parameter name to extract.
 */
export function Query(name) {
    return createHttpParameterDecorator("query", name);
}
/**
 * Binds the request body to a controller method parameter.
 *
 * The body is parsed from the incoming request and passed directly.
 */
export function Body() {
    return createHttpParameterDecorator("body");
}
/**
 * Binds a request header to a controller method parameter.
 *
 * @param name - Header name to extract from the request headers.
 */
export function Headers(name) {
    return createHttpParameterDecorator("header", name);
}
/**
 * Binds a cookie value to a controller method parameter.
 *
 * @param name - Cookie name to extract from the request cookies.
 */
export function Cookies(name) {
    return createHttpParameterDecorator("cookie", name);
}
/**
 * Binds a session value to a controller method parameter.
 *
 * @param name - Optional session property name to extract. If omitted,
 *   the entire session object is passed.
 */
export function Session(name) {
    return createHttpParameterDecorator("session", name);
}
/**
 * Binds the raw HTTP request object to a controller method parameter.
 */
export function Request() {
    return createHttpParameterDecorator("request");
}
/**
 * Binds the HTTP response object to a controller method parameter.
 *
 * Use this to directly manipulate the response (e.g. set status codes,
 * send headers) when needed.
 */
export function Response() {
    return createHttpParameterDecorator("response");
}
/**
 * Binds the execution context to a controller method parameter.
 *
 * The context provides access to the request, response, and execution state
 * within the handler.
 */
export function Ctx() {
    return createHttpParameterDecorator("context");
}
export const ExecutionContext = Ctx;
//# sourceMappingURL=http-params.js.map