var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DatabaseModule_1;
import { Module } from "@sim-lu/core";
import { MemoryDatabaseAdapter } from "./adapter/memory-adapter.js";
import { SqlDatabaseAdapter } from "./adapter/sql-adapter.js";
import { DatabaseService } from "./database.service.js";
import { DATABASE, DATABASE_OPTIONS } from "./tokens.js";
let DatabaseModule = DatabaseModule_1 = class DatabaseModule {
    static forRoot(options = {}) {
        const resolved = resolveDatabaseOptions(options);
        return {
            module: DatabaseModule_1,
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
    static forAdapter(adapter, options = {}) {
        return DatabaseModule_1.forRoot(resolveDatabaseOptions({
            ...options,
            adapter,
        }));
    }
};
DatabaseModule = DatabaseModule_1 = __decorate([
    Module({})
], DatabaseModule);
export { DatabaseModule };
export function resolveDatabaseOptions(options = {}) {
    const resolved = {
        driver: options.driver ?? (options.adapter ? asDriver(options.adapter.driver) : "memory"),
        autoConnect: options.autoConnect ?? true,
        ...(options.client ? { client: options.client } : {}),
        ...(options.adapter ? { adapter: options.adapter } : {}),
    };
    return resolved;
}
function asDriver(driver) {
    return driver;
}
export function createDatabaseAdapter(options) {
    if (options.adapter) {
        return options.adapter;
    }
    if (options.client) {
        return new SqlDatabaseAdapter(options.client, options.driver ?? "sql");
    }
    return new MemoryDatabaseAdapter();
}
//# sourceMappingURL=database.module.js.map