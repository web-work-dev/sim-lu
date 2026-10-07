import { createApplication } from "@sim-lu/core";
import { DatabasePlugin } from "@sim-lu/database";
import { ExpressAdapter } from "@sim-lu/platform-express";

import { AppModule } from "./modules/app.module.js";

async function main() {
    const adapter = new ExpressAdapter({
        error: {
            console: true,
            file: "./logs/full-example.log",
            service: "full-example",
            includeDetails: true,
            includeStack: true,
        },
    });

    const app = await createApplication(AppModule, adapter, {
        plugins: [DatabasePlugin.forRoot({})],
    });
    await app.listen({ port: 3000, host: "127.0.0.1" });
    console.log("Full example server listening on http://127.0.0.1:3000");
    console.log("");
    console.log("Endpoints:");
    console.log("  GET  /health            - Health check");
    console.log("  GET  /health/uptime     - Server uptime");
    console.log("  GET  /todos             - List all todos");
    console.log("  POST /todos             - Create a todo");
    console.log("  GET  /todos/:id         - Get a todo by id");
    console.log("  PUT  /todos/:id         - Update a todo");
    console.log("  POST /todos/:id/complete - Mark todo complete");
    console.log("  DEL  /todos/:id         - Delete a todo");
    console.log("  GET  /secure/todos      - Protected route (needs x-api-key: secret-key)");
    console.log("  WS   /ws/chat           - WebSocket chat gateway");

    process.on("SIGINT", async () => {
        console.log("\nShutting down...");
        await app.close();
        process.exit(0);
    });
}

void main();
