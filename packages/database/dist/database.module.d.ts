import { type DynamicModule } from "@sim-lu/core";
import type { DatabaseAdapter } from "./adapter/database-adapter.js";
import type { DatabaseModuleOptions } from "./config/options.js";
export declare class DatabaseModule {
    static forRoot(options?: DatabaseModuleOptions): DynamicModule;
    static forAdapter(adapter: DatabaseAdapter, options?: Omit<DatabaseModuleOptions, "adapter">): DynamicModule;
}
export declare function resolveDatabaseOptions(options?: DatabaseModuleOptions): DatabaseModuleOptions;
export declare function createDatabaseAdapter(options: DatabaseModuleOptions): DatabaseAdapter;
//# sourceMappingURL=database.module.d.ts.map