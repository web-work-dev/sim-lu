import "@sim-lu/common";
import { DefaultExceptionFilter } from "@sim-lu/error";
import { createExecutionDispatcher } from "../adapter/execution-factory.js";
import { RequestExecutor } from "../adapter/request-executor.js";
import { Container } from "../container/container.js";
import { ExecutionDispatcher } from "../execution/execution-dispatcher.js";
import { RouteRegistry } from "../router/route-registry.js";
import { ContainerComposer } from "./container-composer.js";
import { GlobalEnhancers } from "./global-enhancers.js";
import { LifecycleExecutor } from "./lifecycle-executor.js";
import { ModuleCompiler, } from "./module-compiler.js";
export class ApplicationContext {
    rootModule;
    compiler = new ModuleCompiler();
    composer = new ContainerComposer();
    lifecycle = new LifecycleExecutor();
    routes = new RouteRegistry();
    compiled;
    initOrder = [];
    initialized = false;
    closed = false;
    adapter;
    listening = false;
    dispatchers = new Map();
    enhancers = new GlobalEnhancers();
    fallbackFilter = new DefaultExceptionFilter({
        console: false,
    });
    pluginRegistrations = [];
    pluginValues = new Map();
    closeHooks = [];
    registeredPluginNames = new Set();
    constructor(rootModule, adapter, options = {}) {
        this.rootModule = rootModule;
        this.adapter = adapter;
        this.pluginRegistrations.push(...(options.plugins ?? []));
    }
    static async create(rootModule, adapter, options) {
        const context = new ApplicationContext(rootModule, adapter, options);
        await context.init();
        return context;
    }
    async init() {
        if (this.initialized) {
            return this;
        }
        this.compiled = this.compiler.compile(this.composeRootWithPlugins(this.rootModule, this.pluginRegistrations));
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
    async get(token) {
        if (this.pluginValues.has(token)) {
            return this.pluginValues.get(token);
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
        throw new Error(`Provider not found for token: ${this.getTokenName(token)}`);
    }
    select(module) {
        const wrapper = this.getCompiled().modules.get(module);
        if (!wrapper) {
            throw new Error(`Module "${module.name || "<anonymous>"}" is not part of the application`);
        }
        return wrapper.moduleRef;
    }
    getModules() {
        return this.getCompiled().modules;
    }
    getModuleWrappers() {
        return this.initOrder;
    }
    getModuleContainer() {
        return this.compiler.getModuleContainer();
    }
    getRouteRegistry() {
        this.getCompiled();
        return this.routes;
    }
    getRoutes() {
        this.getCompiled();
        return this.routes.getAll();
    }
    getHttpRoutes() {
        this.getCompiled();
        return this.routes.getHttpRoutes();
    }
    getWebSocketRoutes() {
        this.getCompiled();
        return this.routes.getWebSocketRoutes();
    }
    isInitialized() {
        return this.initialized;
    }
    getAdapter() {
        return this.adapter;
    }
    useGlobalFilters(...filters) {
        this.enhancers.addFilters(filters);
        this.dispatchers.clear();
        return this;
    }
    useGlobalGuards(...guards) {
        this.enhancers.addGuards(guards);
        this.dispatchers.clear();
        return this;
    }
    useGlobalInterceptors(...interceptors) {
        this.enhancers.addInterceptors(interceptors);
        this.dispatchers.clear();
        return this;
    }
    useGlobalPipes(...pipes) {
        this.enhancers.addPipes(pipes);
        this.dispatchers.clear();
        return this;
    }
    useGlobalTransformers(...transformers) {
        this.enhancers.addTransformers(transformers);
        this.dispatchers.clear();
        return this;
    }
    setDefaultExceptionFilter(filter) {
        this.fallbackFilter = filter;
        this.dispatchers.clear();
        return this;
    }
    has(token) {
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
    provide(token, value) {
        this.pluginValues.set(token, value);
        if (this.compiled) {
            for (const module of this.initOrder) {
                module.container.register({
                    token,
                    useValue: value,
                });
                module.instances.set(token, value);
            }
        }
        this.dispatchers.clear();
        return this;
    }
    decorate(token, value) {
        return this.provide(token, value);
    }
    onClose(hook) {
        this.closeHooks.push(hook);
        return this;
    }
    async register(plugin, options) {
        const registration = options === undefined
            ? plugin
            : [plugin, options];
        this.pluginRegistrations.push(registration);
        if (this.initialized) {
            await this.invokePlugin(registration);
        }
        return this;
    }
    isListening() {
        return this.listening;
    }
    async listen(adapterOrOptions, maybeOptions) {
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
    async close(signal) {
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
        }
        else {
            await this.lifecycle.callBeforeApplicationShutdown(reverse, signal);
            await this.lifecycle.callOnModuleDestroy(reverse);
            await this.lifecycle.callOnApplicationShutdown(reverse, signal);
        }
        this.closed = true;
    }
    resolveAdapter(adapterOrOptions) {
        if (this.isHttpAdapter(adapterOrOptions)) {
            return adapterOrOptions;
        }
        if (this.adapter) {
            return this.adapter;
        }
        throw new Error("No HTTP adapter provided. Choose ExpressAdapter from @sim-lu/platform-express or UwsAdapter from @sim-lu/platform-uws.");
    }
    resolveListenOptions(adapterOrOptions, maybeOptions) {
        if (this.isHttpAdapter(adapterOrOptions)) {
            if (!maybeOptions) {
                throw new Error("Listen options are required");
            }
            return maybeOptions;
        }
        return adapterOrOptions;
    }
    isHttpAdapter(value) {
        return typeof value.registerHttp === "function";
    }
    applyAdapterErrorHandler(adapter) {
        const candidate = adapter;
        const handler = candidate.getErrorHandler?.();
        if (handler) {
            this.fallbackFilter = new DefaultExceptionFilter(handler);
            this.dispatchers.clear();
        }
    }
    bindAdapter(adapter) {
        const executor = new RequestExecutor((token) => this.getDispatcher(token));
        for (const route of this.getHttpRoutes()) {
            adapter.registerHttp(route, (request, response) => executor.executeHttp(route, request, response));
        }
        if (adapter.registerWebSocket) {
            const groups = new Map();
            for (const route of this.getWebSocketRoutes()) {
                const current = groups.get(route.path) ?? [];
                current.push(route);
                groups.set(route.path, current);
            }
            for (const [path, routes] of groups) {
                adapter.registerWebSocket(path, routes, (route, state) => executor.executeWebSocket(route, state));
            }
        }
    }
    getDispatcher(token) {
        const existing = this.dispatchers.get(token);
        if (existing) {
            return existing;
        }
        const dispatcher = createExecutionDispatcher(this.getContainerFor(token), {
            filters: this.enhancers.filters,
            guards: this.enhancers.guards,
            interceptors: this.enhancers.interceptors,
            transformers: this.enhancers.transformers,
            fallbackFilter: this.fallbackFilter,
        });
        this.dispatchers.set(token, dispatcher);
        return dispatcher;
    }
    getContainerFor(token) {
        for (const module of this.initOrder) {
            if (module.container.has(token)) {
                return module.container;
            }
        }
        return this.getCompiled().root.container;
    }
    getCompiled() {
        if (!this.compiled) {
            throw new Error("Application context has not been initialized");
        }
        return this.compiled;
    }
    getTokenName(token) {
        if (typeof token === "function") {
            return token.name || "<anonymous>";
        }
        if (typeof token === "symbol") {
            return token.toString();
        }
        return token;
    }
    composeRootWithPlugins(root, registrations) {
        const pluginModules = registrations
            .map((registration) => this.resolvePluginModule(registration))
            .filter((module) => module !== undefined);
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
    resolvePluginModule(registration) {
        const [plugin, options] = this.unwrapRegistration(registration);
        if (!plugin.module) {
            return undefined;
        }
        return plugin.module(options);
    }
    async invokePlugin(registration) {
        const [plugin, options] = this.unwrapRegistration(registration);
        const name = plugin.name;
        if (name && this.registeredPluginNames.has(name)) {
            return;
        }
        if (name) {
            this.registeredPluginNames.add(name);
        }
        await plugin.register?.(this, options);
    }
    unwrapRegistration(registration) {
        if (this.isPluginTuple(registration)) {
            return registration;
        }
        return [registration, undefined];
    }
    isPluginTuple(registration) {
        return Array.isArray(registration);
    }
}
export async function createApplicationContext(rootModule, options) {
    return ApplicationContext.create(rootModule, undefined, options);
}
//# sourceMappingURL=application-context.js.map