import { describe, expect, it, beforeAll, afterAll } from "vitest";

import {
    Controller,
    Get,
    Post,
    Module,
    Injectable,
    Body,
    createApplication,
    type ApplicationContext,
} from "@sim-lu/core";
import {
    ok,
    type SuccessResponse,
} from "@sim-lu/error";
import { ExpressAdapter } from "@sim-lu/platform-express";

@Injectable()
class CounterService {
    private count = 0;
    private readonly lock = { locked: false };

    public increment(): number {
        return ++this.count;
    }

    public get countValue(): number {
        return this.count;
    }
}

@Controller("concurrent")
class ConcurrentController {
    public constructor(private readonly counter: CounterService) {}

    @Get("/incr")
    public incr(): SuccessResponse<{ count: number }> {
        return ok({ count: this.counter.increment() });
    }

    @Post("/echo")
    public echo(@Body() body: { value: string }): SuccessResponse<{ value: string; echoed: boolean }> {
        const upper = body.value.toUpperCase();
        return ok({ value: upper, echoed: true });
    }
}

@Module({
    controllers: [ConcurrentController],
    providers: [CounterService],
})
class ConcurrentModule {}

describe("Concurrency & Resource Contention", () => {
    let app: ApplicationContext;
    let adapter: ExpressAdapter;
    let port: number;

    beforeAll(async () => {
        adapter = new ExpressAdapter({ error: { console: false } });
        app = await createApplication(ConcurrentModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });
        port = adapter.getPort() as number;
    });

    afterAll(async () => {
        await app.close();
    });

    describe("concurrent requests", () => {
        it("handles 100 concurrent GET requests without data loss", async () => {
            const requests = Array.from({ length: 100 }, () =>
                fetch(`http://127.0.0.1:${port}/concurrent/incr`),
            );

            const responses = await Promise.all(requests);
            const bodies = await Promise.all(
                responses.map((res) => res.json() as Promise<{ success: boolean; data: { count: number } }>),
            );

            expect(bodies.every((b) => b.success)).toBe(true);
            const counts = bodies.map((b) => b.data.count).sort((a, b) => a - b);
            expect(counts).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
        });

        it("handles concurrent mixed GET/POST requests", async () => {
            const getRequests = Array.from({ length: 50 }, (_, i) =>
                fetch(`http://127.0.0.1:${port}/concurrent/incr`),
            );

            const postRequests = Array.from({ length: 50 }, (_, i) =>
                fetch(`http://127.0.0.1:${port}/concurrent/echo`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ value: `msg-${i}` }),
                }),
            );

            const allRequests = [...getRequests, ...postRequests];
            const responses = await Promise.all(allRequests);

            expect(responses.every((r) => r.status === 200)).toBe(true);

            const bodies = await Promise.all(
                responses.map((r) => r.json()),
            );

            const postBodies = bodies.slice(50) as Array<{ data: { value: string; echoed: boolean } }>;
            expect(postBodies.every((b) => b.data.echoed === true)).toBe(true);
            expect(postBodies.every((b) => b.data.value === b.data.value.toUpperCase())).toBe(true);
        });

        it("handles 50 concurrent requests to different endpoints", async () => {
            const endpoints = ["/concurrent/incr", "/concurrent/incr", "/concurrent/incr"];
            const requests = Array.from({ length: 50 }, (_, i) =>
                fetch(`http://127.0.0.1:${port}${endpoints[i % endpoints.length]}`),
            );

            const responses = await Promise.all(requests);
            expect(responses.every((r) => r.status === 200)).toBe(true);
        });
    });

    describe("shared state isolation", () => {
        it("singleton service maintains consistent state across requests", async () => {
            await fetch(`http://127.0.0.1:${port}/concurrent/incr`);

            const res = await fetch(`http://127.0.0.1:${port}/concurrent/incr`);
            const body = await res.json() as { data: { count: number } };

            expect(body.data.count).toBeGreaterThan(150);
        });

        it("concurrent requests don't interfere with each other's responses", async () => {
            const requests = Array.from({ length: 20 }, (_, i) =>
                fetch(`http://127.0.0.1:${port}/concurrent/echo`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ value: `unique-${i}` }),
                }),
            );

            const responses = await Promise.all(requests);
            const bodies = await Promise.all(
                responses.map((r) => r.json() as Promise<{ data: { value: string } }>),
            );

            for (let i = 0; i < 20; i++) {
                expect(bodies[i].data.value).toBe(`UNIQUE-${i.toString()}`);
            }
        });
    });

    describe("rapid sequential requests", () => {
        it("handles rapid sequential requests without connection errors", async () => {
            for (let i = 0; i < 50; i++) {
                const res = await fetch(`http://127.0.0.1:${port}/concurrent/incr`);
                expect(res.status).toBe(200);
            }
        });
    });
});
