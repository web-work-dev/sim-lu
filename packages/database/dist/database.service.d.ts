import { type OnModuleDestroy, type OnModuleInit } from "@sim-lu/core";
import type { DatabaseAdapter, DatabaseOperations, QueryResult, SqlValue, TransactionHandle } from "./adapter/database-adapter.js";
import type { DatabaseModuleOptions } from "./config/options.js";
export declare class DatabaseService implements OnModuleInit, OnModuleDestroy, DatabaseOperations {
    private readonly adapter;
    private readonly options;
    constructor(adapter: DatabaseAdapter, options: DatabaseModuleOptions);
    getAdapter(): DatabaseAdapter;
    getOptions(): DatabaseModuleOptions;
    isConnected(): boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    query<T = Record<string, unknown>>(sql: string, params?: readonly SqlValue[]): Promise<QueryResult<T>>;
    execute(sql: string, params?: readonly SqlValue[]): Promise<number>;
    transaction<T>(work: (tx: TransactionHandle) => Promise<T>): Promise<T>;
    insert<T extends Record<string, unknown>>(table: string, data: T): Promise<T>;
    find<T extends Record<string, unknown>>(table: string, where?: Partial<T>): Promise<T[]>;
    findOne<T extends Record<string, unknown>>(table: string, where: Partial<T>): Promise<T | undefined>;
    update<T extends Record<string, unknown>>(table: string, where: Partial<T>, data: Partial<T>): Promise<number>;
    remove<T extends Record<string, unknown>>(table: string, where: Partial<T>): Promise<number>;
    private operations;
    private isOperations;
}
//# sourceMappingURL=database.service.d.ts.map