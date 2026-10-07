import type { HttpMethod } from "../interfaces/methods.js";

/** Metadata attached to a class decorated with `@Controller`. */
export interface ControllerMetadata {
    path: string;
}

/** A token used to identify a provider in the DI container. */
export type ProviderToken = Function | string | symbol;

/** DI provider lifetime scope. */
export type ProviderScope = "singleton" | "request" | "transient";

/** Provider definition used in module metadata. */
export interface CustomProvider {
    readonly token: ProviderToken;
    readonly useClass?: Function;
    readonly useValue?: unknown;
    readonly useFactory?: (...args: unknown[]) => unknown;
    readonly inject?: readonly ProviderToken[];
    readonly scope?: ProviderScope;
}

/** A module provider: either a plain class or a `CustomProvider`. */
export type ModuleProvider = Function | CustomProvider;

/** Metadata for the `@Module` decorator. */
export interface ModuleMetadata {
    imports?: readonly (Function | DynamicModule)[];
    controllers?: readonly Function[];
    providers?: readonly ModuleProvider[];
    exports?: readonly ProviderToken[];
    global?: boolean;
}

/** A module with a dynamically computed metadata object. */
export interface DynamicModule extends ModuleMetadata {
    module: Function;
}

/** Route metadata registered by `@Get`, `@Post`, etc. */
export interface RouteMetadata {
    method: HttpMethod;
    path: string;
    handler: string | symbol;
}

/** Metadata attached to a class decorated with `@WebSocket`. */
export interface WebSocketMetadata {
    path: string;
    subprotocol?: string;
}

/** Metadata for a single WebSocket event handler. */
export interface WebSocketEventMetadata {
    event: string;
    handler: string | symbol;
}

/** Kinds of parameters that can be bound via decorators. */
export type ParameterType =
    | "param"
    | "query"
    | "body"
    | "header"
    | "cookie"
    | "session"
    | "context"
    | "request"
    | "response"
    | "ws-socket"
    | "ws-message"
    | "ws-context";

/** Metadata for a single parameter decorated in a handler method. */
export interface ParameterMetadata {
    type: ParameterType;
    index: number;
    name?: string;
    required?: boolean;
    default?: unknown;
    handler: string | symbol;
}

/** Metadata for a parameter-level pipe registered via `@UsePipes`. */
export interface PipeMetadata {
    index: number;
    pipe: Function;
}

/** Metadata attached to a class decorated with `@Injectable`. */
export interface InjectableMetadata {
    readonly scope?: ProviderScope;
}
