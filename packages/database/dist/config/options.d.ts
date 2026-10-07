import type { SqlClient } from "../adapter/sql-adapter.js";
import type { DatabaseAdapter } from "../adapter/database-adapter.js";
export type DatabaseDriver = "memory" | "sql" | "postgres" | "mysql" | "sqlite" | "mssql" | "oracle";
export interface DatabaseModuleOptions {
    readonly driver?: DatabaseDriver;
    readonly client?: SqlClient;
    readonly adapter?: DatabaseAdapter;
    readonly autoConnect?: boolean;
}
//# sourceMappingURL=options.d.ts.map