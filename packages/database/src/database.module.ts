import { Module, type DynamicModule } from "@sim-lu/core";

import type { DatabaseAdapter } from "./adapter/database-adapter.js";
import { MemoryDatabaseAdapter } from "./adapter/memory-adapter.js";
import { SqlDatabaseAdapter } from "./adapter/sql-adapter.js";
import type { DatabaseModuleOptions } from "./config/options.js";
import { DatabaseService } from "./database.service.js";
import { DATABASE, DATABASE_OPTIONS } from "./tokens.js";

@Module({})
export class DatabaseModule {
    public static forRoot(
        options: DatabaseModuleOptions = {},
    ): DynamicModule {
        const resolved = resolveDatabaseOptions(options);

        return {
            module: DatabaseModule,
            global: true,
            providers: [
                {
                    token: DATABASE_OPTIONS,
                    useValue: resolved,
                },
                {
                    token: DATABASE,
                    useFactory: () => createDatabaseAdapter(resolved),
                },
                DatabaseService,
            ],
            exports: [DATABASE, DATABASE_OPTIONS, DatabaseService],
        };
    }

    public static forAdapter(
        adapter: DatabaseAdapter,
        options: Omit<DatabaseModuleOptions, "adapter"> = {},
    ): DynamicModule {
        return DatabaseModule.forRoot(resolveDatabaseOptions({
            ...options,
            adapter,
        }));
    }
}

export function resolveDatabaseOptions(
    options: DatabaseModuleOptions = {},
): DatabaseModuleOptions {
    const resolved: DatabaseModuleOptions = {
        driver: options.driver ?? (options.adapter ? asDriver(options.adapter.driver) : "memory"),
        autoConnect: options.autoConnect ?? true,
        ...(options.client ? { client: options.client } : {}),
        ...(options.adapter ? { adapter: options.adapter } : {}),
    };

    return resolved;
}

function asDriver(
    driver: string,
): NonNullable<DatabaseModuleOptions["driver"]> {
    return driver as NonNullable<DatabaseModuleOptions["driver"]>;
}

export function createDatabaseAdapter(
    options: DatabaseModuleOptions,
): DatabaseAdapter {
    if (options.adapter) {
        return options.adapter;
    }

    if (options.client) {
        return new SqlDatabaseAdapter(
            options.client,
            options.driver ?? "sql",
        );
    }

    return new MemoryDatabaseAdapter();
}
