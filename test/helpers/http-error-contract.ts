import { describe, expect, it } from "vitest";

import type { MemoryLogTarget, LogEntry } from "@sim-lu/error";
import type { FailureResponse } from "@sim-lu/error";

export interface ErrorContractOptions {
    readonly port: number;
    readonly memoryLog?: MemoryLogTarget<LogEntry>;
}

export function describeHttpErrorContract(
    platform: string,
    getOptions: () => ErrorContractOptions,
): void {
    describe(`${platform} HTTP error contract`, () => {
        it("returns structured JSON 404 for unmatched routes", async () => {
            const { port } = getOptions();
            const res = await fetch(`http://127.0.0.1:${port}/nonexistent`);
            expect(res.status).toBe(404);
            expect(res.headers.get("content-type")).toContain("application/json");

            const body = await res.json() as FailureResponse;
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(404);
            expect(body.error).toBe("Not Found");
            expect(body.message).toBe("Not Found");
        });

        it("serializes BadRequestException to 400 with details", async () => {
            const { port } = getOptions();
            const res = await fetch(`http://127.0.0.1:${port}/contract/bad-request`);
            expect(res.status).toBe(400);
            expect(res.headers.get("content-type")).toContain("application/json");

            const body = await res.json() as FailureResponse;
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(400);
            expect(body.error).toBe("Bad Request");
            expect(body.message).toBe("invalid payload");
            expect(body.details).toEqual({ field: "name" });
        });

        it("serializes NotFoundException to 404", async () => {
            const { port } = getOptions();
            const res = await fetch(`http://127.0.0.1:${port}/contract/not-found`);
            expect(res.status).toBe(404);

            const body = await res.json() as FailureResponse;
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(404);
        });

        it("serializes ConflictException to 409", async () => {
            const { port } = getOptions();
            const res = await fetch(`http://127.0.0.1:${port}/contract/conflict`);
            expect(res.status).toBe(409);

            const body = await res.json() as FailureResponse;
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(409);
        });

        it("serializes generic Error to 500", async () => {
            const { port } = getOptions();
            const res = await fetch(`http://127.0.0.1:${port}/contract/generic`);
            expect(res.status).toBe(500);
            expect(res.headers.get("content-type")).toContain("application/json");

            const body = await res.json() as FailureResponse;
            expect(body.success).toBe(false);
            expect(body.statusCode).toBe(500);
            expect(body.error).toBe("Internal Server Error");
        });

        it("sets x-request-id and x-trace-id headers", async () => {
            const { port } = getOptions();
            const res = await fetch(`http://127.0.0.1:${port}/contract/get`);
            expect(res.headers.get("x-request-id")).toBeTruthy();
            expect(res.headers.get("x-trace-id")).toBeTruthy();
        });

        it("propagates client-provided request-id", async () => {
            const { port } = getOptions();
            const res = await fetch(`http://127.0.0.1:${port}/contract/get`, {
                headers: { "x-request-id": "client-req-123" },
            });
            expect(res.headers.get("x-request-id")).toBe("client-req-123");
        });

        it("propagates client-provided trace-id", async () => {
            const { port } = getOptions();
            const res = await fetch(`http://127.0.0.1:${port}/contract/get`, {
                headers: { "x-trace-id": "client-trace-456" },
            });
            expect(res.headers.get("x-trace-id")).toBe("client-trace-456");
        });

        it("generates unique IDs per request", async () => {
            const { port } = getOptions();
            const res1 = await fetch(`http://127.0.0.1:${port}/contract/get`);
            const res2 = await fetch(`http://127.0.0.1:${port}/contract/get`);

            expect(res1.headers.get("x-request-id"))
                .not.toEqual(res2.headers.get("x-request-id"));
        });

        it("includes correlation IDs in error log entries", async () => {
            const { port, memoryLog } = getOptions();

            if (!memoryLog) {
                return;
            }

            memoryLog.entries = [];

            await fetch(`http://127.0.0.1:${port}/contract/bad-request`, {
                headers: {
                    "x-request-id": "log-req-789",
                    "x-trace-id": "log-trace-789",
                },
            });

            await new Promise((resolve) => setTimeout(resolve, 50));

            const entry = memoryLog.entries.find((e) => e.error);
            expect(entry).toBeDefined();
            expect(entry!.requestId).toBe("log-req-789");
            expect(entry!.traceId).toBe("log-trace-789");
        });

        it("logs 500 errors at error level", async () => {
            const { port, memoryLog } = getOptions();

            if (!memoryLog) {
                return;
            }

            memoryLog.entries = [];

            await fetch(`http://127.0.0.1:${port}/contract/generic`);

            await new Promise((resolve) => setTimeout(resolve, 50));

            const errorEntry = memoryLog.entries.find((e) => e.level === "error");
            expect(errorEntry).toBeDefined();
        });
    });
}
