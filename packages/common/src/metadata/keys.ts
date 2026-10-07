import "./reflect.js";

export const METADATA_KEYS = Object.freeze({
    CONTROLLER: Symbol("@sim-lu:controller"),
    INJECTABLE: Symbol("@sim-lu:injectable"),
    MODULE: Symbol("@sim-lu:module"),

    PIPE: Symbol("@sim-lu:pipe"),
    INTERCEPTOR: Symbol("@sim-lu:interceptor"),
    PARAMETER_PIPES: Symbol("@sim-lu:parameter-pipes"),
    GUARD: Symbol("@sim-lu:guard"),
    EXCEPTION_FILTER: Symbol("@sim-lu:exception-filter"),
    CATCH: Symbol("@sim-lu:catch"),

    ROUTES: Symbol("@sim-lu:routes"),


    WEBSOCKET: Symbol("@sim-lu:websocket"),
    WEBSOCKET_EVENTS: Symbol("@sim-lu:websocket-events"),

    CONSTRUCTOR_PARAMS: Symbol("@sim-lu:constructor-params"),
    PARAM: Symbol("@sim-lu:param"),
    TRANSFORM: Symbol("@sim-lu:transform"),
    GLOBAL_MODULE: Symbol("@sim-lu:global-module"),
} as const);