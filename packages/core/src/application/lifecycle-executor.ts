import type { ModuleWrapper } from "./module-wrapper.js";

const ON_MODULE_INIT = "onModuleInit";
const ON_APPLICATION_BOOTSTRAP = "onApplicationBootstrap";
const ON_MODULE_DESTROY = "onModuleDestroy";
const BEFORE_APPLICATION_SHUTDOWN = "beforeApplicationShutdown";
const ON_APPLICATION_SHUTDOWN = "onApplicationShutdown";

export class LifecycleExecutor {
    public async callOnModuleInit(
        modules: readonly ModuleWrapper[],
    ): Promise<void> {
        await this.callHook(modules, ON_MODULE_INIT);
    }

    public async callOnApplicationBootstrap(
        modules: readonly ModuleWrapper[],
    ): Promise<void> {
        await this.callHook(modules, ON_APPLICATION_BOOTSTRAP);
    }

    public async callOnModuleDestroy(
        modules: readonly ModuleWrapper[],
    ): Promise<void> {
        await this.callHook(modules, ON_MODULE_DESTROY);
    }

    public async callBeforeApplicationShutdown(
        modules: readonly ModuleWrapper[],
        signal?: string,
    ): Promise<void> {
        if (signal === undefined) {
            await this.callHook(modules, BEFORE_APPLICATION_SHUTDOWN);
            return;
        }

        await this.callHook(modules, BEFORE_APPLICATION_SHUTDOWN, signal);
    }

    public async callOnApplicationShutdown(
        modules: readonly ModuleWrapper[],
        signal?: string,
    ): Promise<void> {
        if (signal === undefined) {
            await this.callHook(modules, ON_APPLICATION_SHUTDOWN);
            return;
        }

        await this.callHook(modules, ON_APPLICATION_SHUTDOWN, signal);
    }

    private async callHook(
        modules: readonly ModuleWrapper[],
        hook: string,
        signal?: string,
    ): Promise<void> {
        const args = signal === undefined ? [] : [signal];

        for (const module of modules) {
            for (const instance of module.instances.values()) {
                await this.invoke(instance, hook, args);
            }
        }
    }

    private async invoke(
        instance: unknown,
        hook: string,
        args: readonly unknown[],
    ): Promise<void> {
        if (instance === null || instance === undefined) {
            return;
        }

        if (typeof instance !== "object" && typeof instance !== "function") {
            return;
        }

        const target = instance as Record<string, unknown>;
        const method = target[hook];

        if (typeof method !== "function") {
            return;
        }

        await method.apply(instance, args);
    }
}
