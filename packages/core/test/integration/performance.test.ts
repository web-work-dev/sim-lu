import { describe, expect, it, beforeAll, afterAll } from "vitest";

import {
    Controller,
    Get,
    Module,
    Injectable,
    Inject,
    Param,
    createApplication,
    type ApplicationContext,
} from "@sim-lu/core";
import {
    ok,
    type SuccessResponse,
} from "@sim-lu/error";
import { ExpressAdapter } from "@sim-lu/platform-express";

@Injectable()
class BenchmarkService {
    private readonly cache = new Map<string, string>();

    public get(key: string): string | undefined {
        return this.cache.get(key);
    }

    public set(key: string, value: string): void {
        this.cache.set(key, value);
    }

    public size(): number {
        return this.cache.size;
    }
}

@Controller("perf")
class PerfController {
    public constructor(
        @Inject(BenchmarkService) private readonly cache: BenchmarkService,
    ) {}

    @Get("/simple")
    public simple(): SuccessResponse<{ message: string }> {
        return ok({ message: "hello world" });
    }

    @Get("/echo/:value")
    public echo(@Param("value") value: string): SuccessResponse<{ value: string }> {
        return ok({ value });
    }

    @Get("/cache/:key")
    public cacheGet(@Param("key") key: string): SuccessResponse<{ value: string | undefined; size: number }> {
        return ok({ value: this.cache.get(key), size: this.cache.size() });
    }

    @Get("/cache-set/:key/:value")
    public cacheSet(
        @Param("key") key: string,
        @Param("value") value: string,
    ): SuccessResponse<{ ok: boolean; size: number }> {
        this.cache.set(key, value);
        return ok({ ok: true, size: this.cache.size() });
    }
}

@Module({
    controllers: [PerfController],
    providers: [BenchmarkService],
})
class PerfModule {}

describe("Performance & Benchmark", () => {
    let app: ApplicationContext;
    let adapter: ExpressAdapter;
    let port: number;

    beforeAll(async () => {
        adapter = new ExpressAdapter({ error: { console: false } });
        app = await createApplication(PerfModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });
        port = adapter.getPort() as number;
    });

    afterAll(async () => {
        await app.close();
    });

    function getLatency(url: string): Promise<number> {
        const start = process.hrtime.bigint();
        return fetch(url)
            .then(() => Number(process.hrtime.bigint() - start) / 1_000_000);
    }

    describe("baseline performance", () => {
        it("simple endpoint responds under 100ms", async () => {
            const latency = await getLatency(`http://127.0.0.1:${port}/perf/simple`);
            expect(latency).toBeLessThan(100);
        });

        it("path param endpoint responds under 100ms", async () => {
            const latency = await getLatency(`http://127.0.0.1:${port}/perf/echo/test-value`);
            expect(latency).toBeLessThan(100);
        });

        it("cached service endpoint responds under 100ms", async () => {
            await fetch(`http://127.0.0.1:${port}/perf/cache-set/mykey/myvalue`);
            const latency = await getLatency(`http://127.0.0.1:${port}/perf/cache/mykey`);
            expect(latency).toBeLessThan(100);
        });
    });

    describe("concurrent throughput", () => {
        it("handles 50 concurrent requests with all succeeding", async () => {
            const requests = Array.from({ length: 50 }, (_, i) =>
                fetch(`http://127.0.0.1:${port}/perf/echo/val-${i}`),
            );

            const responses = await Promise.all(requests);
            const bodies = await Promise.all(
                responses.map((r) => r.json() as Promise<{ success: boolean; data: { value: string } }>),
            );

            expect(responses.every((r) => r.status === 200)).toBe(true);
            expect(bodies.every((b) => b.success === true)).toBe(true);
        });

        it("handles 100 concurrent simple requests", async () => {
            const start = Date.now();

            const requests = Array.from({ length: 100 }, () =>
                fetch(`http://127.0.0.1:${port}/perf/simple`).then((r) => r.json()),
            );

            const results = await Promise.all(requests);

            const elapsed = Date.now() - start;
            expect(results.length).toBe(100);
            expect(elapsed).toBeLessThan(5000);
        });
    });

    describe("service injection overhead", () => {
        it("resolves injected service on each request", async () => {
            const cacheService = await app.get<BenchmarkService>(BenchmarkService);

            await fetch(`http://127.0.0.1:${port}/perf/cache-set/perf-key/perf-value`);

            const res = await fetch(`http://127.0.0.1:${port}/perf/cache/perf-key`);
            const body = await res.json() as { data: { value: string | undefined } };

            expect(body.data.value).toBe("perf-value");
            expect(cacheService.get("perf-key")).toBe("perf-value");
        });
    });

    describe("response size impact", () => {
        it("small JSON response is fast", async () => {
            const latency = await getLatency(`http://127.0.0.1:${port}/perf/simple`);
            expect(latency).toBeLessThan(200);
        });
    });

    describe("error path performance", () => {
        it("handles errors without significant overhead", async () => {
            const start = Date.now();
            const requests = Array.from({ length: 20 }, () =>
                fetch(`http://127.0.0.1:${port}/perf/nonexistent`),
            );
            await Promise.all(requests);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeLessThan(2000);
        });
    });

    describe("application lifecycle overhead", () => {
        it("creates and closes application quickly", async () => {
            const adapter = new ExpressAdapter({ error: { console: false } });
            const start = Date.now();
            const lifecycleApp = await createApplication(PerfModule, adapter);
            const createElapsed = Date.now() - start;

            await lifecycleApp.listen({ port: 0, host: "127.0.0.1" });

            const closeStart = Date.now();
            await lifecycleApp.close();
            const closeElapsed = Date.now() - closeStart;

            expect(createElapsed).toBeLessThan(500);
            expect(closeElapsed).toBeLessThan(500);
        });
    });

    describe("memory usage", () => {
        it("does not leak memory across requests", async () => {
            const startMemory = process.memoryUsage().heapUsed;

            const requests = Array.from({ length: 100 }, () =>
                fetch(`http://127.0.0.1:${port}/perf/simple`),
            );
            await Promise.all(requests);

            global.gc?.();
            const endMemory = process.memoryUsage().heapUsed;

            const growthMB = (endMemory - startMemory) / 1024 / 1024;
            expect(growthMB).toBeLessThan(50);
        });
    });

    describe("path param extraction performance", () => {
        it("extracts multiple path params efficiently", async () => {
            const latency = await getLatency(`http://127.0.0.1:${port}/perf/cache-set/path/perfval`);
            expect(latency).toBeLessThan(100);
        });
    });
});
