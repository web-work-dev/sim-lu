function clone(value) {
    return structuredClone(value);
}
function matches(row, where) {
    if (!where) {
        return true;
    }
    return Object.entries(where).every(([key, value]) => row[key] === value);
}
export class MemoryDatabaseAdapter {
    name = "memory";
    driver = "memory";
    connected = false;
    tables = new Map();
    async connect() {
        this.connected = true;
    }
    async disconnect() {
        this.connected = false;
        this.tables.clear();
    }
    isConnected() {
        return this.connected;
    }
    async query(sql, params = []) {
        this.assertConnected();
        const normalized = sql.trim().toLowerCase();
        if (normalized.startsWith("select")) {
            const table = this.parseTable(sql);
            const rows = (this.tables.get(table) ?? []);
            return {
                rows: rows.map((row) => clone(row)),
                rowCount: rows.length,
            };
        }
        if (normalized.startsWith("insert")) {
            const table = this.parseTable(sql);
            const row = params[0] ?? {};
            await this.insert(table, row);
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
    async execute(sql, params = []) {
        const result = await this.query(sql, params);
        return result.rowCount;
    }
    async transaction(work) {
        this.assertConnected();
        const snapshot = new Map([...this.tables.entries()].map(([name, rows]) => [name, clone(rows)]));
        try {
            return await work({
                query: (sql, params) => this.query(sql, params),
            });
        }
        catch (error) {
            this.tables.clear();
            for (const [name, rows] of snapshot) {
                this.tables.set(name, rows);
            }
            throw error;
        }
    }
    async insert(table, data) {
        this.assertConnected();
        const rows = this.tables.get(table) ?? [];
        const stored = clone(data);
        rows.push(stored);
        this.tables.set(table, rows);
        return clone(stored);
    }
    async find(table, where) {
        this.assertConnected();
        const rows = (this.tables.get(table) ?? []);
        return rows.filter((row) => matches(row, where)).map((row) => clone(row));
    }
    async findOne(table, where) {
        const [first] = await this.find(table, where);
        return first;
    }
    async update(table, where, data) {
        this.assertConnected();
        const rows = this.tables.get(table) ?? [];
        let count = 0;
        for (let index = 0; index < rows.length; index += 1) {
            const row = rows[index];
            if (!row || !matches(row, where)) {
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
    async remove(table, where) {
        this.assertConnected();
        const rows = this.tables.get(table) ?? [];
        const remaining = rows.filter((row) => !matches(row, where));
        const count = rows.length - remaining.length;
        this.tables.set(table, remaining);
        return count;
    }
    parseTable(sql) {
        const match = /\b(?:from|into|update|table)\s+([a-zA-Z0-9_]+)/i.exec(sql);
        return match?.[1] ?? "default";
    }
    assertConnected() {
        if (!this.connected) {
            throw new Error("Memory database is not connected");
        }
    }
}
//# sourceMappingURL=memory-adapter.js.map