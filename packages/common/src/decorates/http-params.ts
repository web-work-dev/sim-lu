import {
    METADATA_KEYS,
    type ParameterMetadata,
    type ParameterType,
} from "../metadata/index.js";

function createHttpParameterDecorator(
    type: ParameterType,
    name?: string,
): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        if (propertyKey === undefined) {
            throw new Error(
                "Parameter decorators can only be applied to method parameters",
            );
        }

        const existingParameters =
            Reflect.getMetadata(
                METADATA_KEYS.PARAM,
                (target as object).constructor,
            ) as ParameterMetadata[] | undefined;

        const metadata: ParameterMetadata = name !== undefined
            ? { type, index: parameterIndex, name, handler: propertyKey }
            : { type, index: parameterIndex, handler: propertyKey };

        const parameters = [...(existingParameters ?? [])];
        parameters.push(metadata);

        Reflect.defineMetadata(
            METADATA_KEYS.PARAM,
            parameters,
            (target as object).constructor,
        );
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
export function Param(name?: string): ParameterDecorator {
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
export function Query(name?: string): ParameterDecorator {
    return createHttpParameterDecorator("query", name);
}

/**
 * Binds the request body to a controller method parameter.
 *
 * The body is parsed from the incoming request and passed directly.
 */
export function Body(): ParameterDecorator {
    return createHttpParameterDecorator("body");
}

/**
 * Binds a request header to a controller method parameter.
 *
 * @param name - Header name to extract from the request headers.
 */
export function Headers(name?: string): ParameterDecorator {
    return createHttpParameterDecorator("header", name);
}

/**
 * Binds a cookie value to a controller method parameter.
 *
 * @param name - Cookie name to extract from the request cookies.
 */
export function Cookies(name?: string): ParameterDecorator {
    return createHttpParameterDecorator("cookie", name);
}

/**
 * Binds a session value to a controller method parameter.
 *
 * @param name - Optional session property name to extract. If omitted,
 *   the entire session object is passed.
 */
export function Session(name?: string): ParameterDecorator {
    return createHttpParameterDecorator("session", name);
}

/**
 * Binds the raw HTTP request object to a controller method parameter.
 */
export function Request(): ParameterDecorator {
    return createHttpParameterDecorator("request");
}

/**
 * Binds the HTTP response object to a controller method parameter.
 *
 * Use this to directly manipulate the response (e.g. set status codes,
 * send headers) when needed.
 */
export function Response(): ParameterDecorator {
    return createHttpParameterDecorator("response");
}

/**
 * Binds the execution context to a controller method parameter.
 *
 * The context provides access to the request, response, and execution state
 * within the handler.
 */
export function Ctx(): ParameterDecorator {
    return createHttpParameterDecorator("context");
}

export const ExecutionContext = Ctx;
