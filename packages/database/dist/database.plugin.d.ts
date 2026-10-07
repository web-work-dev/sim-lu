import type { ApplicationPlugin, PluginApplication } from "@sim-lu/core";
import type { DatabaseAdapter } from "./adapter/database-adapter.js";
import type { DatabaseModuleOptions } from "./config/options.js";
import { DatabaseModule } from "./database.module.js";
export declare class DatabasePlugin implements ApplicationPlugin {
    private readonly options;
    readonly name = "database";
    constructor(options?: DatabaseModuleOptions);
    static forRoot(options?: DatabaseModuleOptions): DatabasePlugin;
    static forAdapter(adapter: DatabaseAdapter, options?: Omit<DatabaseModuleOptions, "adapter">): DatabasePlugin;
    module(options?: unknown): ReturnType<typeof DatabaseModule.forRoot>;
    register(app: PluginApplication, options?: unknown): Promise<void>;
    private asOptions;
}
export declare const databasePlugin: DatabasePlugin;
//# sourceMappingURL=database.plugin.d.ts.map