import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { Writable } from "node:stream";

import {
    AdapterLogTarget,
    ErrorHandler,
    InternalServerErrorException,
    MemoryLogTarget,
    NotFoundException,
    StreamLogTarget,
    WebhookLogTarget,
    createErrorLogger,
    createMemoryUploadOptions,
    fromUploadError,
    isMulterError,
} from "../src/index.js";

describe("logger transports", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("writes structured errors to a memory target", async () => {
        const memory = new MemoryLogTarget();
        const handler = new ErrorHandler({
            console: false,
            silent: false,
            platform: "express",
            service: "api",
            targets: [memory],
        });

        handler.handle(new NotFoundException("missing user"), {
            method: "GET",
            url: "/users/9",
            ip: "127.0.0.1",
        });

        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(memory.entries.length).toBeGreaterThan(0);
        memory.clear();
        expect(memory.entries).toEqual([]);
        handler.handle(new NotFoundException("missing user"), {
            method: "GET",
            url: "/users/9",
            ip: "127.0.0.1",
        });
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(memory.entries.length).toBeGreaterThan(0);
        const entry = memory.entries[0];
        expect(entry?.level).toBe("warn");
        expect(entry?.message).toBe("missing user");
        expect(entry?.platform).toBe("express");
        expect(entry?.error?.statusCode).toBe(404);
        expect(entry?.request?.url).toBe("/users/9");
    });

    it("writes json logs to a file", async () => {
        const directory = await mkdtemp(join(tmpdir(), "sim-lu-error-"));
        const file = join(directory, "error.log");
        const logger = createErrorLogger({
            console: false,
            file,
            silent: false,
            service: "files",
        });

        logger.error("disk full", {
            error: { name: "Error", statusCode: 500 },
        });

        await new Promise((resolve) => setTimeout(resolve, 50));
        const contents = await readFile(file, "utf8");
        expect(contents).toContain("disk full");
        expect(contents).toContain("\"statusCode\":500");
    });

    it("forwards entries to adapter-style targets", async () => {
        const sent: unknown[] = [];
        const adapter = new AdapterLogTarget(async (_entry, transformed) => {
            sent.push(transformed);
        });
        const handler = new ErrorHandler({
            console: false,
            targets: [adapter],
        });

        handler.handle(new InternalServerErrorException("boom"));
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(sent.length).toBeGreaterThan(0);
        expect((sent[0] as { message: string }).message).toBe("boom");
    });

    it("writes structured entries to a stream target", async () => {
        const chunks: string[] = [];
        const stream = new Writable({
            write(chunk, _encoding, callback) {
                chunks.push(String(chunk));
                callback();
            },
        });
        const handler = new ErrorHandler({
            console: false,
            targets: [new StreamLogTarget(stream)],
        });

        handler.handle(new InternalServerErrorException("disk"));
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(chunks.join("")).toContain("disk");
        expect(chunks.join("")).toContain("\"statusCode\":500");
    });

    it("posts entries through a webhook target", async () => {
        const bodies: string[] = [];
        const fetchImpl = async (_url: string, init?: RequestInit) => {
            bodies.push(String(init?.body ?? ""));
            return new Response(null, { status: 204 });
        };
        const handler = new ErrorHandler({
            console: false,
            targets: [new WebhookLogTarget("https://logs.example.test/ingest", fetchImpl as typeof fetch)],
        });

        handler.handle(new NotFoundException("gone"));
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(bodies.join("")).toContain("gone");
        expect(bodies.join("")).toContain("\"statusCode\":404");
    });

    it("exposes the underlying winston logger", () => {
        const handler = new ErrorHandler({
            console: false,
            silent: true,
        });

        expect(handler.getLogger()).toBeDefined();
        expect(typeof handler.getLogger().error).toBe("function");
    });
});

describe("upload errors", () => {
    it("detects multer-style errors and maps them to HTTP exceptions", () => {
        const sizeError = { name: "MulterError", code: "LIMIT_FILE_SIZE", field: "avatar" };
        const unexpected = { name: "MulterError", code: "LIMIT_UNEXPECTED_FILE", field: "file" };

        expect(isMulterError(sizeError)).toBe(true);
        expect(fromUploadError(sizeError).message).toMatch(/exceeds the allowed size/);
        expect(fromUploadError(unexpected).message).toMatch(/Unexpected upload field/);
        expect(createMemoryUploadOptions().limits.fileSize).toBe(5 * 1024 * 1024);
        expect(createMemoryUploadOptions({ fileSize: 10 }).limits.fileSize).toBe(10);
        expect(isMulterError(null)).toBe(false);
        expect(isMulterError({ code: "LIMIT_FIELD_COUNT" })).toBe(true);
        expect(fromUploadError({ code: "LIMIT_FIELD_COUNT", message: "too many" }).message).toBe("too many");
        expect(fromUploadError(new Error("plain")).message).toBe("plain");
        expect(fromUploadError("raw").message).toBe("raw");
    });
});
