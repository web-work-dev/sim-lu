import { createDatabaseAdapter, DatabaseModule } from "./database.module.js";
import { DatabaseService } from "./database.service.js";
import { DATABASE, DATABASE_OPTIONS } from "./tokens.js";
export class DatabasePlugin {
    options;
    name = "database";
    constructor(options = {}) {
        this.options = options;
    }
    static forRoot(options = {}) {
        return new DatabasePlugin(options);
    }
    static forAdapter(adapter, options = {}) {
        const next = {
            ...options,
            adapter,
        };
        if (adapter.driver) {
            Object.assign(next, {
                driver: adapter.driver,
            });
        }
        return new DatabasePlugin(next);
    }
    module(options) {
        return DatabaseModule.forRoot({
            ...this.options,
            ...(this.asOptions(options)),
        });
    }
    async register(app, options) {
        const resolved = {
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
    asOptions(options) {
        if (options === undefined || options === null || typeof options !== "object") {
            return {};
        }
        return options;
    }
}
export const databasePlugin = new DatabasePlugin();
//# sourceMappingURL=database.plugin.js.map