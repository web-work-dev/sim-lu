const ON_MODULE_INIT = "onModuleInit";
const ON_APPLICATION_BOOTSTRAP = "onApplicationBootstrap";
const ON_MODULE_DESTROY = "onModuleDestroy";
const BEFORE_APPLICATION_SHUTDOWN = "beforeApplicationShutdown";
const ON_APPLICATION_SHUTDOWN = "onApplicationShutdown";
export class LifecycleExecutor {
    async callOnModuleInit(modules) {
        await this.callHook(modules, ON_MODULE_INIT);
    }
    async callOnApplicationBootstrap(modules) {
        await this.callHook(modules, ON_APPLICATION_BOOTSTRAP);
    }
    async callOnModuleDestroy(modules) {
        await this.callHook(modules, ON_MODULE_DESTROY);
    }
    async callBeforeApplicationShutdown(modules, signal) {
        if (signal === undefined) {
            await this.callHook(modules, BEFORE_APPLICATION_SHUTDOWN);
            return;
        }
        await this.callHook(modules, BEFORE_APPLICATION_SHUTDOWN, signal);
    }
    async callOnApplicationShutdown(modules, signal) {
        if (signal === undefined) {
            await this.callHook(modules, ON_APPLICATION_SHUTDOWN);
            return;
        }
        await this.callHook(modules, ON_APPLICATION_SHUTDOWN, signal);
    }
    async callHook(modules, hook, signal) {
        const args = signal === undefined ? [] : [signal];
        for (const module of modules) {
            for (const instance of module.instances.values()) {
                await this.invoke(instance, hook, args);
            }
        }
    }
    async invoke(instance, hook, args) {
        if (instance === null || instance === undefined) {
            return;
        }
        if (typeof instance !== "object" && typeof instance !== "function") {
            return;
        }
        const target = instance;
        const method = target[hook];
        if (typeof method !== "function") {
            return;
        }
        await method.apply(instance, args);
    }
}
//# sourceMappingURL=lifecycle-executor.js.map