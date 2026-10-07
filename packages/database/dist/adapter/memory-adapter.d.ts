import type { DatabaseAdapter, DatabaseOperations, QueryResult, SqlValue, TransactionHandle } from "./database-adapter.js";
export declare class MemoryDatabaseAdapter implements DatabaseAdapter, DatabaseOperations {
    readonly name = "memory";
    readonly driver = "memory";
    private connected;
    private readonly tables;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    query<T = Record<string, unknown>>(sql: string, params?: readonly SqlValue[]): Promise<QueryResult<T>>;
    execute(sql: string, params?: readonly SqlValue[]): Promise<number>;
    transaction<T>(work: (tx: TransactionHandle) => Promise<T>): Promise<T>;
    insert<T extends Record<string, unknown>>(table: string, data: T): Promise<T>;
    find<T extends Record<string, unknown>>(table: string, where?: Partial<T>): Promise<T[]>;
    findOne<T extends Record<string, unknown>>(table: string, where: Partial<T>): Promise<T | undefined>;
    update<T extends Record<string, unknown>>(table: string, where: Partial<T>, data: Partial<T>): Promise<number>;
    remove<T extends Record<string, unknown>>(table: string, where: Partial<T>): Promise<number>;
    private parseTable;
    private assertConnected;
}
//# sourceMappingURL=memory-adapter.d.ts.map