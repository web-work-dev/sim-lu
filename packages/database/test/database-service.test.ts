import { describe, expect, it } from "vitest";

import {
    DatabaseService,
    MemoryDatabaseAdapter,
    SqlDatabaseAdapter,
    type DatabaseAdapter,
    type QueryResult,
    type SqlValue,
    type TransactionHandle,
} from "../src/index.js";

describe("DatabaseService", () => {
    it("proxies query, execute, and transaction to the adapter", async () => {
        const adapter = new MemoryDatabaseAdapter();
        const service = new DatabaseService(adapter, { autoConnect: false });

        await service.connect();
        await service.query("insert into users", [{ id: 1, name: "ada" }]);
        expect(await service.execute("select * from users")).toBe(1);

        await service.transaction(async (tx) => {
            await tx.query("insert into users", [{ id: 2, name: "grace" }]);
        });

        expect(await service.find("users")).toHaveLength(2);
        await service.disconnect();
    });

    it("exposes options and the underlying adapter", () => {
        const adapter = new MemoryDatabaseAdapter();
        const service = new DatabaseService(adapter, {
            driver: "memory",
            autoConnect: false,
        });

        expect(service.getAdapter()).toBe(adapter);
        expect(service.getOptions()).toEqual({
            driver: "memory",
            autoConnect: false,
        });
    });

    it("connects on module init and disconnects on destroy", async () => {
        const adapter = new MemoryDatabaseAdapter();
        const service = new DatabaseService(adapter, {});

        await service.onModuleInit();
        expect(service.isConnected()).toBe(true);

        await service.onModuleDestroy();
        expect(service.isConnected()).toBe(false);
    });

    it("skips connect when autoConnect is false", async () => {
        const adapter = new MemoryDatabaseAdapter();
        const service = new DatabaseService(adapter, { autoConnect: false });

        await service.onModuleInit();
        expect(service.isConnected()).toBe(false);
    });

    it("throws when the adapter has no table operations", async () => {
        const adapter: DatabaseAdapter = new SqlDatabaseAdapter({
            query: async (
                _sql: string,
                _params?: readonly SqlValue[],
            ): Promise<QueryResult> => ({
                rows: [],
                rowCount: 0,
            }),
            transaction: async <T>(
                work: (tx: TransactionHandle) => Promise<T>,
            ): Promise<T> => work({
                query: async () => ({ rows: [], rowCount: 0 }),
            }),
        });
        const service = new DatabaseService(adapter, { autoConnect: false });
        await adapter.connect();

        expect(() => {
            void service.insert("users", { id: 1 });
        }).toThrow(/does not support high-level table operations/);
    });
});
