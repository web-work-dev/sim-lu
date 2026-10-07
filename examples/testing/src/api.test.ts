import { describe, expect, it, beforeAll, afterAll } from "vitest";

import { AdapterLogTarget, MemoryLogTarget } from "@sim-lu/error";
import { createApplication } from "@sim-lu/core";
import { DatabasePlugin } from "@sim-lu/database";
import { ExpressAdapter } from "@sim-lu/platform-express";

import { AppModule } from "./app.module.js";

interface ApiResponse {
    success: boolean;
    statusCode: number;
    data: Record<string, unknown>;
    message?: string;
}

describe("API Integration Tests", () => {
    let app: Awaited<ReturnType<typeof createApplication>>;
    let port: number;
    const memoryTarget = new MemoryLogTarget();

    beforeAll(async () => {
        const adapter = new ExpressAdapter({
            error: {
                console: false,
                service: "testing-example",
                targets: [memoryTarget],
            },
        });
        app = await createApplication(AppModule, adapter, {
            plugins: [DatabasePlugin.forRoot({})],
        });
        await app.listen({ port: 0, host: "127.0.0.1" });
        port = adapter.getPort() as number;
    }, 10000);

    afterAll(async () => {
        await app.close();
    }, 10000);

    describe("GET /api/hello", () => {
        it("returns greeting with default name", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/api/hello`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.success).toBe(true);
            expect(body.data.message).toBe("Hello, World!");
            expect(body.data.sessionId).toBe("anonymous");
        });

        it("returns greeting with provided name", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/api/hello?name=Kilo`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data.message).toBe("Hello, Kilo!");
            expect(body.data.length).toBe(4);
        });

        it("returns greeting with session ID from header", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/api/hello?name=Kilo`, {
                headers: { "x-session-id": "abc-123" },
            });

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data.sessionId).toBe("abc-123");
        });
    });

    describe("GET /api/hello/:name", () => {
        it("returns greeting for named route param", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/api/hello/Kilo`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data.message).toBe("Hello, Kilo!");
            expect(body.data.length).toBe(4);
        });
    });

    describe("POST /api/echo", () => {
        it("echoes the request body", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/api/echo`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ foo: "bar", count: 42 }),
            });

            expect(res.status).toBe(201);
            const body = await res.json() as ApiResponse;
            expect(body.data).toEqual({ foo: "bar", count: 42 });
        });
    });

    describe("GET /api/items (database-backed)", () => {
        it("returns empty list initially", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/api/items`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toEqual([]);
        });

        it("creates and retrieves an item", async () => {
            const createRes = await fetch(`http://127.0.0.1:${port}/api/items`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "Widget", quantity: 5 }),
            });

            expect(createRes.status).toBe(201);
            const createBody = await createRes.json() as ApiResponse;
            const created = createBody.data as { id: string; name: string; quantity: number };
            expect(created.name).toBe("Widget");
            expect(created.quantity).toBe(5);

            const res = await fetch(`http://127.0.0.1:${port}/api/items/${created.id}`);

            expect(res.status).toBe(200);
            const body = await res.json() as ApiResponse;
            expect(body.data).toEqual(created);
        });

        it("returns 404 for non-existent item", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/api/items/nonexistent`, {
                headers: { "accept": "application/json" },
            });

            expect(res.status).toBe(404);
            const body = await res.json() as ApiResponse;
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(404);

            // Verify request ID is in response headers
            expect(res.headers.get("x-request-id")).toBeTruthy();
            expect(res.headers.get("x-trace-id")).toBeTruthy();
        });
    });

    describe("Request correlation", () => {
        it("assigns a request ID when none is provided", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/api/hello`);
            const requestId = res.headers.get("x-request-id");
            const traceId = res.headers.get("x-trace-id");

            expect(requestId).toBeTruthy();
            expect(traceId).toBeTruthy();
            expect(requestId).not.toBe(traceId);
        });

        it("respects client-provided request ID", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/api/hello`, {
                headers: { "x-request-id": "client-provided-123" },
            });

            expect(res.headers.get("x-request-id")).toBe("client-provided-123");
        });

        it("logs request IDs to the memory target", async () => {
            memoryTarget.clear();

            await fetch(`http://127.0.0.1:${port}/nonexistent`, {
                headers: { "x-request-id": "log-test-456" },
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

            const entry = memoryTarget.entries.find(
                (e) => e.request?.requestId === "log-test-456",
            );
            expect(entry).toBeDefined();
            expect(entry?.traceId).toBeTruthy();
            expect(entry?.platform).toBe("express");
            expect(entry?.service).toBe("testing-example");
        });
    });

    describe("AdapterLogTarget", () => {
        it("receives structured log entries with request context", async () => {
            const received: Array<Record<string, unknown>> = [];
            const target = new AdapterLogTarget(async (_entry, transformed) => {
                received.push(transformed);
            });

            const adapter = new ExpressAdapter({
                error: {
                    console: false,
                    service: "adapter-demo",
                    targets: [target],
                },
            });
            const targetApp = await createApplication(AppModule, adapter, {
                plugins: [DatabasePlugin.forRoot({})],
            });

            await targetApp.listen({ port: 0, host: "127.0.0.1" });
            const targetPort = adapter.getPort() as number;

            const res = await fetch(`http://127.0.0.1:${targetPort}/nonexistent`, {
                headers: { "x-request-id": "adapter-log-789" },
            });

            await new Promise((resolve) => setTimeout(resolve, 50));
            await targetApp.close();
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(res.status).toBe(404);
            expect(received.length).toBeGreaterThan(0);

            const entry = received.find(
                (e) => e.requestId === "adapter-log-789",
            );
            expect(entry).toBeDefined();
            expect(entry?.service).toBe("adapter-demo");
            expect(entry?.error).toBeDefined();
            expect((entry?.error as { statusCode: number }).statusCode).toBe(404);
        });
    });
});
