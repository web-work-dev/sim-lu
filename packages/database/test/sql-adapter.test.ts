import { describe, expect, it } from "vitest";

import {
    SqlDatabaseAdapter,
    type QueryResult,
    type SqlClient,
    type SqlValue,
    type TransactionHandle,
} from "../src/index.js";

class FakeSqlClient implements SqlClient {
    public connected = false;
    public queries: Array<{ sql: string; params: readonly SqlValue[] }> = [];
    public executeCalls: Array<{ sql: string; params: readonly SqlValue[] }> = [];
    public useTransaction = false;

    public async connect(): Promise<void> {
        this.connected = true;
    }

    public async disconnect(): Promise<void> {
        this.connected = false;
    }

    public async query<T = Record<string, unknown>>(
        sql: string,
        params: readonly SqlValue[] = [],
    ): Promise<QueryResult<T>> {
        this.queries.push({ sql, params });
        return {
            rows: [{ sql, params }] as T[],
            rowCount: 1,
        };
    }

    public async execute(
        sql: string,
        params: readonly SqlValue[] = [],
    ): Promise<number> {
        this.executeCalls.push({ sql, params });
        return 2;
    }

    public async transaction<T>(
        work: (tx: TransactionHandle) => Promise<T>,
    ): Promise<T> {
        this.useTransaction = true;
        return work({
            query: (sql, params) => this.query(sql, params),
        });
    }
}

describe("SqlDatabaseAdapter", () => {
    it("connects through the client and reports driver name", async () => {
        const client = new FakeSqlClient();
        const adapter = new SqlDatabaseAdapter(client, "postgres");

        expect(adapter.name).toBe("postgres");
        expect(adapter.driver).toBe("postgres");
        expect(adapter.isConnected()).toBe(false);

        await adapter.connect();
        expect(adapter.isConnected()).toBe(true);
        expect(client.connected).toBe(true);

        await adapter.disconnect();
        expect(adapter.isConnected()).toBe(false);
        expect(client.connected).toBe(false);
    });

    it("throws when querying before connect", async () => {
        const adapter = new SqlDatabaseAdapter(new FakeSqlClient());

        await expect(adapter.query("select 1")).rejects.toThrow(/not connected/);
    });

    it("delegates query and execute to the client", async () => {
        const client = new FakeSqlClient();
        const adapter = new SqlDatabaseAdapter(client);
        await adapter.connect();

        const result = await adapter.query("select 1", [1]);
        expect(result.rowCount).toBe(1);
        expect(client.queries[0]).toEqual({ sql: "select 1", params: [1] });

        expect(await adapter.execute("update t set x = 1")).toBe(2);
        expect(client.executeCalls).toHaveLength(1);
    });

    it("falls back to query rowCount when execute is missing", async () => {
        const client: SqlClient = {
            query: async () => ({ rows: [{}], rowCount: 4 }),
        };
        const adapter = new SqlDatabaseAdapter(client);
        await adapter.connect();

        expect(await adapter.execute("update t")).toBe(4);
    });

    it("uses client transactions when available", async () => {
        const client = new FakeSqlClient();
        const adapter = new SqlDatabaseAdapter(client);
        await adapter.connect();

        const value = await adapter.transaction(async (tx) => {
            await tx.query("select 1");
            return 9;
        });

        expect(value).toBe(9);
        expect(client.useTransaction).toBe(true);
    });

    it("falls back to direct queries when client has no transaction", async () => {
        const client: SqlClient = {
            query: async (sql) => ({ rows: [{ sql }], rowCount: 1 }),
        };
        const adapter = new SqlDatabaseAdapter(client);
        await adapter.connect();

        const result = await adapter.transaction((tx) => tx.query("select 1"));
        expect(result.rows[0]).toEqual({ sql: "select 1" });
    });
});
