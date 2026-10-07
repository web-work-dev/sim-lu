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
import { BadRequestException, MemoryLogTarget, NotFoundException } from "@sim-lu/error";

import { ExpressAdapter } from "../src/index.js";

describe("ExpressAdapter", () => {
    it("identifies itself as express", () => {
        expect(new ExpressAdapter().name).toBe("express");
    });

    it("registers HTTP and websocket routes from ApplicationContext", async () => {
        @Controller("ping")
        class PingController {
            @Get()
            public ping(): string {
                return "pong";
            }
        }

        @WebSocket("/events")
        class EventsGateway {
            @OnMessage()
            public onMessage(): string {
                return "event";
            }
        }

        @Module({
            controllers: [PingController, EventsGateway],
        })
        class AppModule {}

        const adapter = new ExpressAdapter();
        const app = await createApplication(AppModule, adapter);

        await app.listen({ port: 0, host: "127.0.0.1" });

        expect(adapter.getRegisteredHttpRoutes()).toHaveLength(1);
        expect(adapter.getRegisteredWebSocketPaths()).toEqual(["/events"]);
        expect(app.getAdapter()?.name).toBe("express");
        expect(adapter.getPort()).toBeGreaterThan(0);

        await app.close();
    });

    it("executes HTTP handlers through express", async () => {
        @Controller("echo")
        class EchoController {
            @Get()
            public ping(): { readonly ok: boolean } {
                return { ok: true };
            }

            @Get("/:id")
            public find(): { readonly id: string } {
                return { id: "7" };
            }

            @Post()
            public create(): { readonly created: boolean } {
                return { created: true };
            }
        }

        @Module({
            controllers: [EchoController],
        })
        class AppModule {}

        const adapter = new ExpressAdapter();
        const app = await ApplicationContext.create(AppModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });

        const port = adapter.getPort();
        expect(port).toBeGreaterThan(0);

        const response = await fetch(`http://127.0.0.1:${port}/echo`);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ ok: true });

        const paramResponse = await fetch(`http://127.0.0.1:${port}/echo/7`);
        expect(await paramResponse.json()).toEqual({ id: "7" });

        const postResponse = await fetch(`http://127.0.0.1:${port}/echo`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "ada" }),
        });
        expect(await postResponse.json()).toEqual({ created: true });

        const missing = await fetch(`http://127.0.0.1:${port}/missing`);
        expect(missing.status).toBe(404);
        expect(await missing.json()).toMatchObject({
            success: false,
            statusCode: 404,
            error: "Not Found",
        });

        await app.close();
    });

    it("serializes thrown HttpExceptions through the shared error package", async () => {
        const memory = new MemoryLogTarget();

        @Controller("items")
        class ItemController {
            @Get("/fail")
            public fail(): never {
                throw new BadRequestException("invalid payload", {
                    details: { field: "name" },
                });
            }

            @Get("/crash")
            public crash(): never {
                throw new Error("unexpected");
            }

            @Get("/missing")
            public missing(): never {
                throw new NotFoundException("item missing");
            }
        }

        @Module({
            controllers: [ItemController],
        })
        class AppModule {}

        const adapter = new ExpressAdapter({
            error: {
                console: false,
                targets: [memory],
            },
        });
        const app = await ApplicationContext.create(AppModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });

        const port = adapter.getPort();
        const bad = await fetch(`http://127.0.0.1:${port}/items/fail`);
        expect(bad.status).toBe(400);
        expect(await bad.json()).toEqual({
            success: false,
            statusCode: 400,
            error: "Bad Request",
            message: "invalid payload",
            details: { field: "name" },
        });

        const crash = await fetch(`http://127.0.0.1:${port}/items/crash`);
        expect(crash.status).toBe(500);
        expect(await crash.json()).toMatchObject({
            success: false,
            statusCode: 500,
            error: "Internal Server Error",
            message: "unexpected",
        });

        const missing = await fetch(`http://127.0.0.1:${port}/items/missing`);
        expect(missing.status).toBe(404);
        expect(await missing.json()).toMatchObject({
            success: false,
            message: "item missing",
        });

        expect(adapter.getErrorHandler()).toBeDefined();
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(memory.entries.length).toBeGreaterThan(0);

        await app.close();
    });
});
