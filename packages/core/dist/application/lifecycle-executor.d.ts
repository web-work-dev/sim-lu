import type { ModuleWrapper } from "./module-wrapper.js";
export declare class LifecycleExecutor {
    callOnModuleInit(modules: readonly ModuleWrapper[]): Promise<void>;
    callOnApplicationBootstrap(modules: readonly ModuleWrapper[]): Promise<void>;
    callOnModuleDestroy(modules: readonly ModuleWrapper[]): Promise<void>;
    callBeforeApplicationShutdown(modules: readonly ModuleWrapper[], signal?: string): Promise<void>;
    callOnApplicationShutdown(modules: readonly ModuleWrapper[], signal?: string): Promise<void>;
    private callHook;
    private invoke;
}
//# sourceMappingURL=lifecycle-executor.d.ts.map