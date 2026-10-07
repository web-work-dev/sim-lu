export type SqlValue = string | number | boolean | null | Buffer | Date;
export interface QueryResult<T = Record<string, unknown>> {
    readonly rows: readonly T[];
    readonly rowCount: number;
}
export interface TransactionHandle {
    query<T = Record<string, unknown>>(sql: string, params?: readonly SqlValue[]): Promise<QueryResult<T>>;
}
export interface DatabaseAdapter {
    readonly name: string;
    readonly driver: string;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    query<T = Record<string, unknown>>(sql: string, params?: readonly SqlValue[]): Promise<QueryResult<T>>;
    execute(sql: string, params?: readonly SqlValue[]): Promise<number>;
    transaction<T>(work: (tx: TransactionHandle) => Promise<T>): Promise<T>;
}
export interface DatabaseOperations {
    insert<T extends Record<string, unknown>>(table: string, data: T): Promise<T>;
    find<T extends Record<string, unknown>>(table: string, where?: Partial<T>): Promise<T[]>;
    findOne<T extends Record<string, unknown>>(table: string, where: Partial<T>): Promise<T | undefined>;
    update<T extends Record<string, unknown>>(table: string, where: Partial<T>, data: Partial<T>): Promise<number>;
    remove<T extends Record<string, unknown>>(table: string, where: Partial<T>): Promise<number>;
}
//# sourceMappingURL=database-adapter.d.ts.map