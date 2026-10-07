import { describe, expect, it } from "vitest";

import {
    ApplicationContext,
    Inject,
    Injectable,
    Module,
} from "@sim-lu/core";

import {
    DATABASE,
    DATABASE_OPTIONS,
    DatabaseModule,
    DatabaseService,
    MemoryDatabaseAdapter,
    SqlDatabaseAdapter,
    createDatabaseAdapter,
    type DatabaseAdapter,
    type QueryResult,
} from "../src/index.js";

@Injectable()
class UserStore {
    public constructor(
        @Inject(DATABASE)
        public readonly adapter: DatabaseAdapter,
        public readonly database: DatabaseService,
    ) { }
}

describe("createDatabaseAdapter", () => {
    it("returns a memory adapter by default", () => {
        const adapter = createDatabaseAdapter({});
        expect(adapter).toBeInstanceOf(MemoryDatabaseAdapter);
    });

    it("returns the provided adapter", () => {
        const existing = new MemoryDatabaseAdapter();
        expect(createDatabaseAdapter({ adapter: existing })).toBe(existing);
    });

    it("wraps a sql client", () => {
        const adapter = createDatabaseAdapter({
            client: {
                query: async (): Promise<QueryResult> => ({
                    rows: [],
                    rowCount: 0,
                }),
            },
            driver: "postgres",
        });

        expect(adapter).toBeInstanceOf(SqlDatabaseAdapter);
        expect(adapter.driver).toBe("postgres");
    });
});

describe("DatabaseModule", () => {
    it("injects the database into the application without a template file", async () => {
        @Module({
            imports: [DatabaseModule.forRoot()],
            providers: [UserStore],
        })
        class AppModule { }

        const app = await ApplicationContext.create(AppModule);
        const store = await app.get(UserStore);
        const service = await app.get(DatabaseService);

        expect(store.adapter).toBeInstanceOf(MemoryDatabaseAdapter);
        expect(store.database).toBe(service);
        expect(service.isConnected()).toBe(true);
        expect((await app.get(DATABASE_OPTIONS)).driver).toBe("memory");

        await service.insert("users", { id: 1, name: "ada" });
        expect(await service.find("users")).toEqual([{ id: 1, name: "ada" }]);

        await app.close();
        expect(service.isConnected()).toBe(false);
    });

    it("accepts a custom adapter via forAdapter", async () => {
        const adapter = new MemoryDatabaseAdapter();

        @Module({
            imports: [DatabaseModule.forAdapter(adapter)],
        })
        class AppModule { }

        const app = await ApplicationContext.create(AppModule);
        expect(await app.get(DATABASE)).toBe(adapter);
        expect((await app.get(DatabaseService)).getAdapter()).toBe(adapter);
        await app.close();
    });

    it("skips autoConnect when disabled so the user controls lifecycle", async () => {
        @Module({
            imports: [DatabaseModule.forRoot({ autoConnect: false })],
        })
        class AppModule { }

        const app = await ApplicationContext.create(AppModule);
        const database = await app.get(DatabaseService);

        expect(database.isConnected()).toBe(false);
        await database.connect();
        expect(database.isConnected()).toBe(true);
        await database.disconnect();
        await app.close();
    });
});
