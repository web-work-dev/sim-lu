import type {
    ApplicationPlugin,
    PluginApplication,
} from "@sim-lu/core";

import type { DatabaseAdapter } from "./adapter/database-adapter.js";
import type { DatabaseModuleOptions } from "./config/options.js";
import { createDatabaseAdapter, DatabaseModule } from "./database.module.js";
import { DatabaseService } from "./database.service.js";
import { DATABASE, DATABASE_OPTIONS } from "./tokens.js";

export class DatabasePlugin implements ApplicationPlugin {
    public readonly name = "database";

    public constructor(
        private readonly options: DatabaseModuleOptions = {},
    ) { }

    public static forRoot(
        options: DatabaseModuleOptions = {},
    ): DatabasePlugin {
        return new DatabasePlugin(options);
    }

    public static forAdapter(
        adapter: DatabaseAdapter,
        options: Omit<DatabaseModuleOptions, "adapter"> = {},
    ): DatabasePlugin {
        const next: DatabaseModuleOptions = {
            ...options,
            adapter,
        };

        if (adapter.driver) {
            Object.assign(next, {
                driver: adapter.driver as NonNullable<DatabaseModuleOptions["driver"]>,
            });
        }

        return new DatabasePlugin(next);
    }

    public module(
        options?: unknown,
    ): ReturnType<typeof DatabaseModule.forRoot> {
        return DatabaseModule.forRoot({
            ...this.options,
            ...(this.asOptions(options)),
        });
    }

    public async register(
        app: PluginApplication,
        options?: unknown,
    ): Promise<void> {
        const resolved: DatabaseModuleOptions = {
            ...this.options,
            ...this.asOptions(options),
        };

        if (app.has(DATABASE) && app.has(DatabaseService)) {
            return;
        }

        const adapter = resolved.adapter ?? createDatabaseAdapter(resolved);
        const service = app.has(DatabaseService)
            ? await app.get(DatabaseService)
            : new DatabaseService(adapter, resolved);

        if (resolved.autoConnect !== false && !adapter.isConnected()) {
            await adapter.connect();
        }

        app.decorate(DATABASE, adapter);
        app.decorate(DATABASE_OPTIONS, resolved);
        app.decorate(DatabaseService, service);
        app.onClose(async () => {
            if (adapter.isConnected()) {
                await adapter.disconnect();
            }
        });
    }

    private asOptions(
        options: unknown,
    ): DatabaseModuleOptions {
        if (options === undefined || options === null || typeof options !== "object") {
            return {};
        }

        return options as DatabaseModuleOptions;
    }
}

export const databasePlugin = new DatabasePlugin();
