/**
 * Binds a route parameter to a controller method parameter.
 *
 * When applied to a route parameter (e.g. `/users/:id`), this decorator extracts
 * the matching value from the route parameters. If `name` is provided, it looks up
 * `params[name]`; otherwise it passes the entire `params` object.
 *
 * @param name - Optional parameter name to extract from route params.
 */
export declare function Param(name?: string): ParameterDecorator;
/**
 * Binds a query string parameter to a controller method parameter.
 *
 * When `name` is provided, it extracts `query[name]`. Otherwise it passes
 * the entire query object. Supports default values via parameter default
 * syntax (`@Query("page") page = "1"`).
 *
 * @param name - Optional query parameter name to extract.
 */
export declare function Query(name?: string): ParameterDecorator;
/**
 * Binds the request body to a controller method parameter.
 *
 * The body is parsed from the incoming request and passed directly.
 */
export declare function Body(): ParameterDecorator;
/**
 * Binds a request header to a controller method parameter.
 *
 * @param name - Header name to extract from the request headers.
 */
export declare function Headers(name?: string): ParameterDecorator;
/**
 * Binds a cookie value to a controller method parameter.
 *
 * @param name - Cookie name to extract from the request cookies.
 */
export declare function Cookies(name?: string): ParameterDecorator;
/**
 * Binds a session value to a controller method parameter.
 *
 * @param name - Optional session property name to extract. If omitted,
 *   the entire session object is passed.
 */
export declare function Session(name?: string): ParameterDecorator;
/**
 * Binds the raw HTTP request object to a controller method parameter.
 */
export declare function Request(): ParameterDecorator;
/**
 * Binds the HTTP response object to a controller method parameter.
 *
 * Use this to directly manipulate the response (e.g. set status codes,
 * send headers) when needed.
 */
export declare function Response(): ParameterDecorator;
/**
 * Binds the execution context to a controller method parameter.
 *
 * The context provides access to the request, response, and execution state
 * within the handler.
 */
export declare function Ctx(): ParameterDecorator;
export declare const ExecutionContext: typeof Ctx;
//# sourceMappingURL=http-params.d.ts.map