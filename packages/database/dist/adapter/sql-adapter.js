export class SqlDatabaseAdapter {
    client;
    name;
    driver;
    connected = false;
    constructor(client, driver = "sql") {
        this.client = client;
        this.driver = driver;
        this.name = driver;
    }
    async connect() {
        await this.client.connect?.();
        this.connected = true;
    }
    async disconnect() {
        await this.client.disconnect?.();
        this.connected = false;
    }
    isConnected() {
        return this.connected;
    }
    async query(sql, params = []) {
        this.assertConnected();
        return this.client.query(sql, params);
    }
    async execute(sql, params = []) {
        this.assertConnected();
        if (this.client.execute) {
            return this.client.execute(sql, params);
        }
        const result = await this.query(sql, params);
        return result.rowCount;
    }
    async transaction(work) {
        this.assertConnected();
        if (this.client.transaction) {
            return this.client.transaction(work);
        }
        return work({
            query: (sql, params) => this.query(sql, params),
        });
    }
    assertConnected() {
        if (!this.connected) {
            throw new Error(`${this.driver} database is not connected`);
        }
    }
}
//# sourceMappingURL=sql-adapter.js.map