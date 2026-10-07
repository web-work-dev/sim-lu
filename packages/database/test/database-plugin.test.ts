import { describe, expect, it } from "vitest";

import {
    ApplicationContext,
    Inject,
    Injectable,
    Module,
    createApplicationContext,
} from "@sim-lu/core";

import {
    DATABASE,
    DatabasePlugin,
    DatabaseService,
    MemoryDatabaseAdapter,
    databasePlugin,
    type DatabaseAdapter,
} from "../src/index.js";

@Injectable()
class Notes {
    public constructor(
        public readonly database: DatabaseService,
        @Inject(DATABASE)
        public readonly adapter: DatabaseAdapter,
    ) { }
}

describe("DatabasePlugin", () => {
    it("injects database into the server like a fastify plugin", async () => {
        @Module({
            providers: [Notes],
        })
        class AppModule { }

        const app = await createApplicationContext(AppModule, {
            plugins: [DatabasePlugin.forRoot()],
        });

        const notes = await app.get(Notes);
        expect(notes.database).toBeInstanceOf(DatabaseService);
        expect(notes.adapter).toBeInstanceOf(MemoryDatabaseAdapter);
        expect(await app.get(DATABASE)).toBe(notes.adapter);

        await notes.database.insert("notes", { id: 1, body: "hello" });
        expect(await notes.database.findOne("notes", { id: 1 })).toEqual({
            id: 1,
            body: "hello",
        });

        await app.close();
        expect(notes.database.isConnected()).toBe(false);
    });

    it("registers after bootstrap without a database module template", async () => {
        @Module({})
        class AppModule { }

        const app = await ApplicationContext.create(AppModule);
        await app.register(databasePlugin);

        const database = await app.get(DatabaseService);
        expect(database.isConnected()).toBe(true);
        await database.insert("items", { id: 1 });
        expect(await database.find("items")).toEqual([{ id: 1 }]);

        await app.close();
        expect(database.isConnected()).toBe(false);
    });

    it("lets the user supply an adapter and control operations", async () => {
        const adapter = new MemoryDatabaseAdapter();

        @Module({})
        class AppModule { }

        const app = await createApplicationContext(AppModule, {
            plugins: [[DatabasePlugin.forAdapter(adapter), { autoConnect: false }]],
        });

        const database = await app.get(DatabaseService);
        expect(database.getAdapter()).toBe(adapter);
        expect(database.isConnected()).toBe(false);

        await database.connect();
        await database.insert("users", { id: 1, name: "ada" });
        await database.update("users", { id: 1 }, { name: "grace" });
        expect(await database.findOne("users", { id: 1 })).toEqual({
            id: 1,
            name: "grace",
        });
        expect(await database.remove("users", { id: 1 })).toBe(1);

        await app.close();
    });
});
