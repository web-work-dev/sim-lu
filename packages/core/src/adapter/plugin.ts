import type { InjectToken } from "../container/token.js";
import type { HttpAdapter } from "./http-adapter.js";

export interface PluginApplication {
    get<T>(
        token: InjectToken<T>,
    ): Promise<T>;
    has(
        token: InjectToken,
    ): boolean;
    provide<T>(
        token: InjectToken<T>,
        value: T,
    ): this;
    decorate<T>(
        token: InjectToken<T>,
        value: T,
    ): this;
    onClose(
        hook: () => void | Promise<void>,
    ): this;
    getAdapter(): HttpAdapter | undefined;
    useGlobalFilters(
        ...filters: readonly Function[]
    ): this;
    useGlobalGuards(
        ...guards: readonly Function[]
    ): this;
    useGlobalInterceptors(
        ...interceptors: readonly Function[]
    ): this;
    useGlobalPipes(
        ...pipes: readonly Function[]
    ): this;
    useGlobalTransformers(
        ...transformers: readonly Function[]
    ): this;
    register(
        plugin: ApplicationPlugin,
        options?: unknown,
    ): Promise<this>;
}

export interface ApplicationPlugin {
    readonly name?: string;
    module?(
        options?: unknown,
    ): Function | { module: Function };
    register?(
        app: PluginApplication,
        options?: unknown,
    ): void | Promise<void>;
}

export type PluginRegistration =
    | ApplicationPlugin
    | readonly [ApplicationPlugin, unknown];

export interface CreateApplicationOptions {
    readonly plugins?: ReadonlyArray<PluginRegistration>;
}
