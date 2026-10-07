import { describe, expect, it } from "vitest";

import {
    ApplicationContext,
    Controller,
    createApplication,
    Get,
    Module,
    OnMessage,
    Post,
    WebSocket,
} from "@sim-lu/core";
import { BadRequestException, MemoryLogTarget } from "@sim-lu/error";

import { UwsAdapter } from "../src/index.js";

describe("UwsAdapter", () => {
    it("identifies itself as uws", () => {
        expect(new UwsAdapter().name).toBe("uws");
    });

    it("registers HTTP and websocket routes from ApplicationContext", async () => {
        @Controller("status")
        class StatusController {
            @Get()
            public status(): string {
                return "ready";
            }
        }

        @WebSocket("/live")
        class LiveGateway {
            @OnMessage()
            public onMessage(): string {
                return "live";
            }
        }

        @Module({
            controllers: [StatusController, LiveGateway],
        })
        class AppModule {}

        const adapter = new UwsAdapter();
        const app = await createApplication(AppModule, adapter);

        await app.listen({ port: 0, host: "127.0.0.1" });

        expect(adapter.getRegisteredHttpRoutes()).toHaveLength(1);
        expect(adapter.getRegisteredWebSocketPaths()).toEqual(["/live"]);
        expect(app.getAdapter()?.name).toBe("uws");
        expect(await adapter.dispatchWebSocket("/live", "$message")).toBe("live");

        await app.close();
    });

    it("can be selected as the application platform", async () => {
        @Controller("health")
        class HealthController {
            @Get()
            public ping(): { readonly status: string } {
                return { status: "ok" };
            }
        }

        @Module({
            controllers: [HealthController],
        })
        class AppModule {}

        const adapter = new UwsAdapter();
        const app = await ApplicationContext.create(AppModule);
        await app.listen(adapter, { port: 0, host: "127.0.0.1" });

        expect(app.getAdapter()).toBe(adapter);
        expect(app.isListening()).toBe(true);

        await app.close();
    });

    it("serializes HttpExceptions and 404s through the shared error package", async () => {
        const memory = new MemoryLogTarget();

        @Controller("probe")
        class ProbeController {
            @Get()
            public ok(): { readonly ready: boolean } {
                return { ready: true };
            }

            @Get("/fail")
            public fail(): never {
                throw new BadRequestException("bad probe", {
                    details: { reason: "invalid" },
                });
            }

            @Get("/crash")
            public crash(): never {
                throw new Error("uws boom");
            }

            @Post("/echo")
            public echo(): { readonly accepted: boolean } {
                return { accepted: true };
            }
        }

        @Module({
            controllers: [ProbeController],
        })
        class AppModule {}

        const adapter = new UwsAdapter({
            error: {
                console: false,
                targets: [memory],
            },
        });
        const app = await ApplicationContext.create(AppModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });

        const port = adapter.getPort();
        expect(port).toBeGreaterThan(0);
        expect(adapter.getErrorHandler()).toBeDefined();

        const ok = await fetch(`http://127.0.0.1:${port}/probe`);
        expect(ok.status).toBe(200);
        expect(await ok.json()).toEqual({ ready: true });

        const fail = await fetch(`http://127.0.0.1:${port}/probe/fail`);
        expect(fail.status).toBe(400);
        expect(await fail.json()).toEqual({
            success: false,
            statusCode: 400,
            error: "Bad Request",
            message: "bad probe",
            details: { reason: "invalid" },
        });

        const crash = await fetch(`http://127.0.0.1:${port}/probe/crash`);
        expect(crash.status).toBe(500);
        expect(await crash.json()).toMatchObject({
            success: false,
            statusCode: 500,
            message: "uws boom",
        });

        const missing = await fetch(`http://127.0.0.1:${port}/nope`);
        expect(missing.status).toBe(404);
        expect(await missing.json()).toMatchObject({
            success: false,
            statusCode: 404,
            error: "Not Found",
        });

        const created = await fetch(`http://127.0.0.1:${port}/probe/echo`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ping: true }),
        });
        expect(await created.json()).toEqual({ accepted: true });

        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(memory.entries.length).toBeGreaterThan(0);

        await app.close();
    });
});
