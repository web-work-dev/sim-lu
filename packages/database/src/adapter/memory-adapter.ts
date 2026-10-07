import type {
    DatabaseAdapter,
    DatabaseOperations,
    QueryResult,
    SqlValue,
    TransactionHandle,
} from "./database-adapter.js";

function clone<T>(
    value: T,
): T {
    return structuredClone(value);
}

function matches<T extends Record<string, unknown>>(
    row: T,
    where: Partial<T> | undefined,
): boolean {
    if (!where) {
        return true;
    }

    return Object.entries(where).every(([key, value]) => row[key] === value);
}

export class MemoryDatabaseAdapter implements DatabaseAdapter, DatabaseOperations {
    public readonly name = "memory";
    public readonly driver = "memory";

    private connected = false;
    private readonly tables = new Map<string, Record<string, unknown>[]>();

    public async connect(): Promise<void> {
        this.connected = true;
    }

    public async disconnect(): Promise<void> {
        this.connected = false;
        this.tables.clear();
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public async query<T = Record<string, unknown>>(
        sql: string,
        params: readonly SqlValue[] = [],
    ): Promise<QueryResult<T>> {
        this.assertConnected();

        const normalized = sql.trim().toLowerCase();

        if (normalized.startsWith("select")) {
            const table = this.parseTable(sql);
            const rows = (this.tables.get(table) ?? []) as T[];
            return {
                rows: rows.map((row) => clone(row)),
                rowCount: rows.length,
            };
        }

        if (normalized.startsWith("insert")) {
            const table = this.parseTable(sql);
            const row = (params[0] as unknown as T | undefined) ?? {} as T;
            await this.insert(table, row as Record<string, unknown>);
            return {
                rows: [clone(row)],
                rowCount: 1,
            };
        }

        return {
            rows: [],
            rowCount: 0,
        };
    }

    public async execute(
        sql: string,
        params: readonly SqlValue[] = [],
    ): Promise<number> {
        const result = await this.query(sql, params);
        return result.rowCount;
    }

    public async transaction<T>(
        work: (tx: TransactionHandle) => Promise<T>,
    ): Promise<T> {
        this.assertConnected();

        const snapshot = new Map(
            [...this.tables.entries()].map(([name, rows]) => [name, clone(rows)]),
        );

        try {
            return await work({
                query: (sql, params) => this.query(sql, params),
            });
        } catch (error) {
            this.tables.clear();

            for (const [name, rows] of snapshot) {
                this.tables.set(name, rows);
            }

            throw error;
        }
    }

    public async insert<T extends Record<string, unknown>>(
        table: string,
        data: T,
    ): Promise<T> {
        this.assertConnected();
        const rows = this.tables.get(table) ?? [];
        const stored = clone(data);
        rows.push(stored);
        this.tables.set(table, rows);
        return clone(stored);
    }

    public async find<T extends Record<string, unknown>>(
        table: string,
        where?: Partial<T>,
    ): Promise<T[]> {
        this.assertConnected();
        const rows = (this.tables.get(table) ?? []) as T[];
        return rows.filter((row) => matches(row, where)).map((row) => clone(row));
    }

    public async findOne<T extends Record<string, unknown>>(
        table: string,
        where: Partial<T>,
    ): Promise<T | undefined> {
        const [first] = await this.find(table, where);
        return first;
    }

    public async update<T extends Record<string, unknown>>(
        table: string,
        where: Partial<T>,
        data: Partial<T>,
    ): Promise<number> {
        this.assertConnected();
        const rows = this.tables.get(table) ?? [];
        let count = 0;

        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];

            if (!row || !matches(row as T, where)) {
                continue;
            }

            rows[index] = {
                ...row,
                ...data,
            };
            count += 1;
        }

        return count;
    }

    public async remove<T extends Record<string, unknown>>(
        table: string,
        where: Partial<T>,
    ): Promise<number> {
        this.assertConnected();
        const rows = this.tables.get(table) ?? [];
        const remaining = rows.filter((row) => !matches(row as T, where));
        const count = rows.length - remaining.length;
        this.tables.set(table, remaining);
        return count;
    }

    private parseTable(
        sql: string,
    ): string {
        const match = /\b(?:from|into|update|table)\s+([a-zA-Z0-9_]+)/i.exec(sql);
        return match?.[1] ?? "default";
    }

    private assertConnected(): void {
        if (!this.connected) {
            throw new Error("Memory database is not connected");
        }
    }
}
