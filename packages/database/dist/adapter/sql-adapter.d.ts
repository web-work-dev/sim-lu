import type { DatabaseAdapter, QueryResult, SqlValue, TransactionHandle } from "./database-adapter.js";
export interface SqlClient {
    query<T = Record<string, unknown>>(sql: string, params?: readonly SqlValue[]): Promise<QueryResult<T>> | QueryResult<T>;
    execute?(sql: string, params?: readonly SqlValue[]): Promise<number> | number;
    transaction?<T>(work: (tx: TransactionHandle) => Promise<T>): Promise<T>;
    connect?(): Promise<void> | void;
    disconnect?(): Promise<void> | void;
}
export declare class SqlDatabaseAdapter implements DatabaseAdapter {
    private readonly client;
    readonly name: string;
    readonly driver: string;
    private connected;
    constructor(client: SqlClient, driver?: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    query<T = Record<string, unknown>>(sql: string, params?: readonly SqlValue[]): Promise<QueryResult<T>>;
    execute(sql: string, params?: readonly SqlValue[]): Promise<number>;
    transaction<T>(work: (tx: TransactionHandle) => Promise<T>): Promise<T>;
    private assertConnected;
}
//# sourceMappingURL=sql-adapter.d.ts.map