import type {
    DatabaseAdapter,
    QueryResult,
    SqlValue,
    TransactionHandle,
} from "./database-adapter.js";

export interface SqlClient {
    query<T = Record<string, unknown>>(
        sql: string,
        params?: readonly SqlValue[],
    ): Promise<QueryResult<T>> | QueryResult<T>;
    execute?(
        sql: string,
        params?: readonly SqlValue[],
    ): Promise<number> | number;
    transaction?<T>(
        work: (tx: TransactionHandle) => Promise<T>,
    ): Promise<T>;
    connect?(): Promise<void> | void;
    disconnect?(): Promise<void> | void;
}

export class SqlDatabaseAdapter implements DatabaseAdapter {
    public readonly name: string;
    public readonly driver: string;
    private connected = false;

    public constructor(
        private readonly client: SqlClient,
        driver = "sql",
    ) {
        this.driver = driver;
        this.name = driver;
    }

    public async connect(): Promise<void> {
        await this.client.connect?.();
        this.connected = true;
    }

    public async disconnect(): Promise<void> {
        await this.client.disconnect?.();
        this.connected = false;
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public async query<T = Record<string, unknown>>(
        sql: string,
        params: readonly SqlValue[] = [],
    ): Promise<QueryResult<T>> {
        this.assertConnected();
        return this.client.query<T>(sql, params);
    }

    public async execute(
        sql: string,
        params: readonly SqlValue[] = [],
    ): Promise<number> {
        this.assertConnected();

        if (this.client.execute) {
            return this.client.execute(sql, params);
        }

        const result = await this.query(sql, params);
        return result.rowCount;
    }

    public async transaction<T>(
        work: (tx: TransactionHandle) => Promise<T>,
    ): Promise<T> {
        this.assertConnected();

        if (this.client.transaction) {
            return this.client.transaction(work);
        }

        return work({
            query: (sql, params) => this.query(sql, params),
        });
    }

    private assertConnected(): void {
        if (!this.connected) {
            throw new Error(`${this.driver} database is not connected`);
        }
    }
}
