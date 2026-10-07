import { createApplication } from "@sim-lu/core";
import { DatabasePlugin } from "@sim-lu/database";
import { ExpressAdapter } from "@sim-lu/platform-express";

import { AppModule, ConfigService } from "./app.module.js";

async function main(): Promise<void> {
    const adapter = new ExpressAdapter({
        error: {
            console: true,
            file: "./logs/env-config.log",
            service: "env-config",
        },
    });

    const app = await createApplication(AppModule, adapter, {
        plugins: [DatabasePlugin.forRoot({})],
    });
    const config = app.get<ConfigService>(ConfigService);

    const port = config.get("PORT");
    const env = config.get("NODE_ENV");
    console.log(`Environment config example: ${env} mode`);
    console.log(`Database URL configured: ${config.get("DATABASE_URL") !== undefined}`);
    console.log("Endpoints:");
    console.log("  GET  /config/database  - Database URL (masked)");
    console.log("  GET  /config/environment - Environment info");
    console.log("  GET  /config/db/status  - Database connection status");

    await app.listen({ port, host: "127.0.0.1" });
    console.log(`Server listening on http://127.0.0.1:${port}`);

    process.on("SIGINT", async () => {
        await app.close();
        process.exit(0);
    });
}

void main();
