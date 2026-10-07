import { describe, expect, it } from "vitest";

import { MemoryDatabaseAdapter } from "../src/index.js";

describe("MemoryDatabaseAdapter", () => {
    it("connects and disconnects", async () => {
        const adapter = new MemoryDatabaseAdapter();

        expect(adapter.name).toBe("memory");
        expect(adapter.driver).toBe("memory");
        expect(adapter.isConnected()).toBe(false);

        await adapter.connect();
        expect(adapter.isConnected()).toBe(true);

        await adapter.disconnect();
        expect(adapter.isConnected()).toBe(false);
    });

    it("throws when used before connect", async () => {
        const adapter = new MemoryDatabaseAdapter();

        await expect(adapter.find("users")).rejects.toThrow(/not connected/);
    });

    it("inserts, finds, updates, and removes rows", async () => {
        const adapter = new MemoryDatabaseAdapter();
        await adapter.connect();

        const created = await adapter.insert("users", { id: 1, name: "ada" });
        expect(created).toEqual({ id: 1, name: "ada" });

        expect(await adapter.find("users")).toEqual([{ id: 1, name: "ada" }]);
        expect(await adapter.findOne("users", { id: 1 })).toEqual({
            id: 1,
            name: "ada",
        });
        expect(await adapter.find("users", { name: "ada" })).toHaveLength(1);

        expect(await adapter.update("users", { id: 1 }, { name: "grace" })).toBe(1);
        expect(await adapter.findOne("users", { id: 1 })).toEqual({
            id: 1,
            name: "grace",
        });

        expect(await adapter.remove("users", { id: 1 })).toBe(1);
        expect(await adapter.find("users")).toEqual([]);
    });

    it("clones stored rows so callers cannot mutate internal state", async () => {
        const adapter = new MemoryDatabaseAdapter();
        await adapter.connect();

        const row = await adapter.insert("users", { id: 1, name: "ada" });
        row.name = "mutated";

        expect(await adapter.findOne("users", { id: 1 })).toEqual({
            id: 1,
            name: "ada",
        });
    });

    it("parses select and insert sql", async () => {
        const adapter = new MemoryDatabaseAdapter();
        await adapter.connect();

        await adapter.query("insert into items", [{ id: 1, title: "one" }]);
        const result = await adapter.query("select * from items");

        expect(result.rowCount).toBe(1);
        expect(result.rows).toEqual([{ id: 1, title: "one" }]);
        expect(await adapter.execute("select * from items")).toBe(1);
        expect(await adapter.execute("delete from items")).toBe(0);
    });

    it("rolls back transactions on failure", async () => {
        const adapter = new MemoryDatabaseAdapter();
        await adapter.connect();
        await adapter.insert("users", { id: 1, name: "ada" });

        await expect(
            adapter.transaction(async (tx) => {
                await tx.query("insert into users", [{ id: 2, name: "grace" }]);
                throw new Error("fail");
            }),
        ).rejects.toThrow("fail");

        expect(await adapter.find("users")).toEqual([{ id: 1, name: "ada" }]);
    });

    it("commits transactions when work succeeds", async () => {
        const adapter = new MemoryDatabaseAdapter();
        await adapter.connect();

        await adapter.transaction(async (tx) => {
            await tx.query("insert into users", [{ id: 1, name: "ada" }]);
        });

        expect(await adapter.find("users")).toEqual([{ id: 1, name: "ada" }]);
    });

    it("clears tables on disconnect", async () => {
        const adapter = new MemoryDatabaseAdapter();
        await adapter.connect();
        await adapter.insert("users", { id: 1, name: "ada" });
        await adapter.disconnect();
        await adapter.connect();

        expect(await adapter.find("users")).toEqual([]);
    });
});
