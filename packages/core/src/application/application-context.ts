import "@sim-lu/common";
import type { DynamicModule, ProviderToken } from "@sim-lu/common";
import { DefaultExceptionFilter } from "@sim-lu/error";

import type {
    HttpAdapter,
    ListenOptions,
} from "../adapter/http-adapter.js";
import { createExecutionDispatcher } from "../adapter/execution-factory.js";
import type {
    ApplicationPlugin,
    PluginApplication,
    PluginRegistration,
    CreateApplicationOptions,
} from "../adapter/plugin.js";
import { RequestExecutor } from "../adapter/request-executor.js";
import { Container } from "../container/container.js";
import type { InjectToken } from "../container/token.js";
import type { ExceptionFilter } from "../exception-filter/exception-filter.js";
import { ExecutionDispatcher } from "../execution/execution-dispatcher.js";
import type { ModuleContainer } from "../module/module-container.js";
import type { ModuleRef } from "../module/module-ref.js";
import { RouteRegistry } from "../router/route-registry.js";
import type {
    HttpRouteDefinition,
    RouteDefinition,
    WebSocketRouteDefinition,
} from "../router/route-definition.js";
import { ContainerComposer } from "./container-composer.js";
import { GlobalEnhancers } from "./global-enhancers.js";
import { LifecycleExecutor } from "./lifecycle-executor.js";
import {
    ModuleCompiler,
    type CompiledModules,
} from "./module-compiler.js";
import type { ModuleWrapper } from "./module-wrapper.js";

export class ApplicationContext {
    private readonly compiler = new ModuleCompiler();
    private readonly composer = new ContainerComposer();
    private readonly lifecycle = new LifecycleExecutor();
    private readonly routes = new RouteRegistry();

    private compiled: CompiledModules | undefined;
    private initOrder: ModuleWrapper[] = [];
    private initialized = false;
    private closed = false;
    private adapter: HttpAdapter | undefined;
    private listening = false;
    private readonly dispatchers = new Map<InjectToken, ExecutionDispatcher>();
    private readonly enhancers = new GlobalEnhancers();
    private fallbackFilter: ExceptionFilter = new DefaultExceptionFilter({
        console: false,
    });
    private readonly pluginRegistrations: PluginRegistration[] = [];
    private readonly pluginValues = new Map<InjectToken, unknown>();
    private readonly closeHooks: Array<() => void | Promise<void>> = [];
    private readonly registeredPluginNames = new Set<string>();

    public constructor(
        private readonly rootModule: Function | DynamicModule,
        adapter?: HttpAdapter,
        options: CreateApplicationOptions = {},
    ) {
        this.adapter = adapter;
        this.pluginRegistrations.push(...(options.plugins ?? []));
    }

    public static async create(
        rootModule: Function | DynamicModule,
        adapter?: HttpAdapter,
        options?: CreateApplicationOptions,
    ): Promise<ApplicationContext> {
        const context = new ApplicationContext(rootModule, adapter, options);
        await context.init();
        return context;
    }

    public async init(): Promise<this> {
        if (this.initialized) {
            return this;
        }

        this.compiled = this.compiler.compile(
            this.composeRootWithPlugins(this.rootModule, this.pluginRegistrations),
        );
        this.initOrder = await this.composer.compose(this.compiled);
        this.routes.exploreModules(this.initOrder);

        await this.lifecycle.callOnModuleInit(this.initOrder);
        await this.lifecycle.callOnApplicationBootstrap(this.initOrder);

        for (const registration of this.pluginRegistrations) {
            await this.invokePlugin(registration);
        }

        this.initialized = true;
        return this;
    }

    public async get<T>(
        token: InjectToken<T>,
    ): Promise<T> {
        if (this.pluginValues.has(token)) {
            return this.pluginValues.get(token) as T;
        }

        const compiled = this.getCompiled();

        if (compiled.root.container.has(token)) {
            return compiled.root.container.resolve(token);
        }

        for (const module of this.initOrder) {
            if (module === compiled.root) {
                continue;
            }

            if (module.container.has(token)) {
                return module.container.resolve(token);
            }
        }

        throw new Error(
            `Provider not found for token: ${this.getTokenName(token)}`,
        );
    }

    public select(
        module: Function,
    ): ModuleRef {
        const wrapper = this.getCompiled().modules.get(module);

        if (!wrapper) {
            throw new Error(
                `Module "${module.name || "<anonymous>"}" is not part of the application`,
            );
        }

        return wrapper.moduleRef;
    }

    public getModules(): ReadonlyMap<Function, ModuleWrapper> {
        return this.getCompiled().modules;
    }

    public getModuleWrappers(): readonly ModuleWrapper[] {
        return this.initOrder;
    }

    public getModuleContainer(): ModuleContainer {
        return this.compiler.getModuleContainer();
    }

    public getRouteRegistry(): RouteRegistry {
        this.getCompiled();
        return this.routes;
    }

    public getRoutes(): readonly RouteDefinition[] {
        this.getCompiled();
        return this.routes.getAll();
    }

    public getHttpRoutes(): readonly HttpRouteDefinition[] {
        this.getCompiled();
        return this.routes.getHttpRoutes();
    }

    public getWebSocketRoutes(): readonly WebSocketRouteDefinition[] {
        this.getCompiled();
        return this.routes.getWebSocketRoutes();
    }

    public isInitialized(): boolean {
        return this.initialized;
    }

    public getAdapter(): HttpAdapter | undefined {
        return this.adapter;
    }

    public useGlobalFilters(
        ...filters: readonly Function[]
    ): this {
        this.enhancers.addFilters(filters);
        this.dispatchers.clear();
        return this;
    }

    public useGlobalGuards(
        ...guards: readonly Function[]
    ): this {
        this.enhancers.addGuards(guards);
        this.dispatchers.clear();
        return this;
    }

    public useGlobalInterceptors(
        ...interceptors: readonly Function[]
    ): this {
        this.enhancers.addInterceptors(interceptors);
        this.dispatchers.clear();
        return this;
    }

    public useGlobalPipes(
        ...pipes: readonly Function[]
    ): this {
        this.enhancers.addPipes(pipes);
        this.dispatchers.clear();
        return this;
    }

    public useGlobalTransformers(
        ...transformers: readonly Function[]
    ): this {
        this.enhancers.addTransformers(transformers);
        this.dispatchers.clear();
        return this;
    }

    public setDefaultExceptionFilter(
        filter: ExceptionFilter,
    ): this {
        this.fallbackFilter = filter;
        this.dispatchers.clear();
        return this;
    }

    public has(
        token: InjectToken,
    ): boolean {
        if (this.pluginValues.has(token)) {
            return true;
        }

        if (!this.compiled) {
            return false;
        }

        if (this.compiled.root.container.has(token)) {
            return true;
        }

        for (const module of this.initOrder) {
            if (module.container.has(token)) {
                return true;
            }
        }

        return false;
    }

    public provide<T>(
        token: InjectToken<T>,
        value: T,
    ): this {
        this.pluginValues.set(token, value);

        if (this.compiled) {
            for (const module of this.initOrder) {
                module.container.register({
                    token,
                    useValue: value,
                });
                module.instances.set(token as ProviderToken, value);
            }
        }

        this.dispatchers.clear();
        return this;
    }

    public decorate<T>(
        token: InjectToken<T>,
        value: T,
    ): this {
        return this.provide(token, value);
    }

    public onClose(
        hook: () => void | Promise<void>,
    ): this {
        this.closeHooks.push(hook);
        return this;
    }

    public async register(
        plugin: ApplicationPlugin,
        options?: unknown,
    ): Promise<this> {
        const registration: PluginRegistration = options === undefined
            ? plugin
            : [plugin, options];
        this.pluginRegistrations.push(registration);

        if (this.initialized) {
            await this.invokePlugin(registration);
        }

        return this;
    }

    public isListening(): boolean {
        return this.listening;
    }

    public async listen(
        options: ListenOptions,
    ): Promise<this>;

    public async listen(
        adapter: HttpAdapter,
        options: ListenOptions,
    ): Promise<this>;

    public async listen(
        adapterOrOptions: HttpAdapter | ListenOptions,
        maybeOptions?: ListenOptions,
    ): Promise<this> {
        if (!this.initialized) {
            await this.init();
        }

        if (this.listening) {
            throw new Error("Application is already listening");
        }

        const adapter = this.resolveAdapter(adapterOrOptions);
        const options = this.resolveListenOptions(adapterOrOptions, maybeOptions);

        this.adapter = adapter;
        this.applyAdapterErrorHandler(adapter);
        this.bindAdapter(adapter);
        await adapter.listen(options);
        this.listening = true;
        return this;
    }

    public async close(
        signal?: string,
    ): Promise<void> {
        if (this.closed || !this.initialized) {
            return;
        }

        if (this.listening && this.adapter) {
            await this.adapter.close();
            this.listening = false;
        }

        for (const hook of [...this.closeHooks].reverse()) {
            await hook();
        }

        const reverse = [...this.initOrder].reverse();

        if (signal === undefined) {
            await this.lifecycle.callBeforeApplicationShutdown(reverse);
            await this.lifecycle.callOnModuleDestroy(reverse);
            await this.lifecycle.callOnApplicationShutdown(reverse);
        } else {
            await this.lifecycle.callBeforeApplicationShutdown(reverse, signal);
            await this.lifecycle.callOnModuleDestroy(reverse);
            await this.lifecycle.callOnApplicationShutdown(reverse, signal);
        }

        this.closed = true;
    }

    private resolveAdapter(
        adapterOrOptions: HttpAdapter | ListenOptions,
    ): HttpAdapter {
        if (this.isHttpAdapter(adapterOrOptions)) {
            return adapterOrOptions;
        }

        if (this.adapter) {
            return this.adapter;
        }

        throw new Error(
            "No HTTP adapter provided. Choose ExpressAdapter from @sim-lu/platform-express or UwsAdapter from @sim-lu/platform-uws.",
        );
    }

    private resolveListenOptions(
        adapterOrOptions: HttpAdapter | ListenOptions,
        maybeOptions: ListenOptions | undefined,
    ): ListenOptions {
        if (this.isHttpAdapter(adapterOrOptions)) {
            if (!maybeOptions) {
                throw new Error("Listen options are required");
            }

            return maybeOptions;
        }

        return adapterOrOptions;
    }

    private isHttpAdapter(
        value: HttpAdapter | ListenOptions,
    ): value is HttpAdapter {
        return typeof (value as HttpAdapter).registerHttp === "function";
    }

    private applyAdapterErrorHandler(
        adapter: HttpAdapter,
    ): void {
        const candidate = adapter as HttpAdapter & {
            getErrorHandler?(): unknown;
        };
        const handler = candidate.getErrorHandler?.();

        if (handler) {
            this.fallbackFilter = new DefaultExceptionFilter(handler as ConstructorParameters<typeof DefaultExceptionFilter>[0]);
            this.dispatchers.clear();
        }
    }

    private bindAdapter(
        adapter: HttpAdapter,
    ): void {
        const executor = new RequestExecutor((token) => this.getDispatcher(token));

        for (const route of this.getHttpRoutes()) {
            adapter.registerHttp(route, (request, response) =>
                executor.executeHttp(route, request, response),
            );
        }

        if (adapter.registerWebSocket) {
            const groups = new Map<string, WebSocketRouteDefinition[]>();

            for (const route of this.getWebSocketRoutes()) {
                const current = groups.get(route.path) ?? [];
                current.push(route);
                groups.set(route.path, current);
            }

            for (const [path, routes] of groups) {
                adapter.registerWebSocket(path, routes, (route, state) =>
                    executor.executeWebSocket(route, state),
                );
            }
        }
    }

    private getDispatcher(
        token: InjectToken,
    ): ExecutionDispatcher {
        const existing = this.dispatchers.get(token);

        if (existing) {
            return existing;
        }

        const dispatcher = createExecutionDispatcher(
            this.getContainerFor(token),
            {
                filters: this.enhancers.filters,
                guards: this.enhancers.guards,
                interceptors: this.enhancers.interceptors,
                transformers: this.enhancers.transformers,
                fallbackFilter: this.fallbackFilter,
            },
        );

        this.dispatchers.set(token, dispatcher);
        return dispatcher;
    }

    private getContainerFor(
        token: InjectToken,
    ): Container {
        for (const module of this.initOrder) {
            if (module.container.has(token)) {
                return module.container;
            }
        }

        return this.getCompiled().root.container;
    }

    private getCompiled(): CompiledModules {
        if (!this.compiled) {
            throw new Error("Application context has not been initialized");
        }

        return this.compiled;
    }

    private getTokenName(
        token: InjectToken,
    ): string {
        if (typeof token === "function") {
            return token.name || "<anonymous>";
        }

        if (typeof token === "symbol") {
            return token.toString();
        }

        return token;
    }

    private composeRootWithPlugins(
        root: Function | DynamicModule,
        registrations: readonly PluginRegistration[],
    ): Function | DynamicModule {
        const pluginModules = registrations
            .map((registration) => this.resolvePluginModule(registration))
            .filter((module): module is Function | DynamicModule => module !== undefined);

        if (pluginModules.length === 0) {
            return root;
        }

        if (typeof root === "function") {
            return {
                module: root,
                imports: pluginModules,
            };
        }

        return {
            ...root,
            imports: [
                ...(root.imports ?? []),
                ...pluginModules,
            ],
        };
    }

    private resolvePluginModule(
        registration: PluginRegistration,
    ): Function | DynamicModule | undefined {
        const [plugin, options] = this.unwrapRegistration(registration);

        if (!plugin.module) {
            return undefined;
        }

        return plugin.module(options);
    }

    private async invokePlugin(
        registration: PluginRegistration,
    ): Promise<void> {
        const [plugin, options] = this.unwrapRegistration(registration);
        const name = plugin.name;

        if (name && this.registeredPluginNames.has(name)) {
            return;
        }

        if (name) {
            this.registeredPluginNames.add(name);
        }

        await plugin.register?.(this as PluginApplication, options);
    }

    private unwrapRegistration(
        registration: PluginRegistration,
    ): readonly [ApplicationPlugin, unknown?] {
        if (this.isPluginTuple(registration)) {
            return registration;
        }

        return [registration, undefined];
    }

    private isPluginTuple(
        registration: PluginRegistration,
    ): registration is readonly [ApplicationPlugin, unknown] {
        return Array.isArray(registration);
    }
}

export async function createApplicationContext(
    rootModule: Function | DynamicModule,
    options?: CreateApplicationOptions,
): Promise<ApplicationContext> {
    return ApplicationContext.create(rootModule, undefined, options);
}
