import { describe, expect, it } from "vitest";

import {
    BadRequestException,
    ErrorHandler,
    MemoryLogTarget,
    applySerializedBody,
    createPlatformErrorHandler,
    handleAdapterError,
    notFoundBody,
    resolveException,
    snapshotRequest,
} from "../src/index.js";

describe("ErrorHandler", () => {
    it("serializes handled exceptions as json", () => {
        const handler = new ErrorHandler({
            console: false,
            silent: true,
            platform: "uws",
        });
        const body = handler.handle(new BadRequestException("invalid", {
            details: { field: "id" },
            headers: { "x-error": "validation" },
        }), {
            method: "POST",
            url: "/items",
        });

        expect(body.statusCode).toBe(400);
        expect(body.contentType).toContain("application/json");
        expect(body.headers["x-error"]).toBe("validation");
        expect(JSON.parse(body.payload)).toEqual({
            success: false,
            statusCode: 400,
            error: "Bad Request",
            message: "invalid",
            details: { field: "id" },
        });
    });

    it("includes stack traces when enabled", () => {
        const handler = new ErrorHandler({
            console: false,
            silent: true,
            includeStack: true,
        });
        const body = handler.handle(new Error("crash"));
        const parsed = JSON.parse(body.payload) as { stack?: string };

        expect(body.statusCode).toBe(500);
        expect(parsed.stack).toContain("Error");
    });

    it("hides details when includeDetails is false", () => {
        const handler = new ErrorHandler({
            console: false,
            silent: true,
            includeDetails: false,
        });
        const parsed = JSON.parse(handler.handle(new BadRequestException("bad", {
            details: { secret: true },
        })).payload) as Record<string, unknown>;

        expect(parsed.details).toBeUndefined();
    });
});

describe("adapter helpers", () => {
    it("snapshots request metadata without undefined keys", () => {
        expect(snapshotRequest({ method: "GET", url: "/x" })).toEqual({
            method: "GET",
            url: "/x",
        });
    });

    it("resolves multer and status-shaped errors", () => {
        const multer = resolveException({
            name: "MulterError",
            code: "LIMIT_FILE_SIZE",
            field: "avatar",
        });
        const shaped = resolveException({
            statusCode: 409,
            message: "taken",
            details: { id: 1 },
        });

        expect((multer as Error).message).toMatch(/exceeds/);
        expect((shaped as { statusCode: number }).statusCode).toBe(409);
    });

    it("applies serialized bodies onto a writable response", () => {
        const memory = new MemoryLogTarget();
        const handler = createPlatformErrorHandler("express", {
            console: false,
            silent: true,
            targets: [memory],
        });
        const serialized = handleAdapterError(handler, new BadRequestException("nope"));
        const headers: Record<string, string | string[]> = {};
        const response = {
            status: 200,
            body: undefined as unknown,
            setHeader(name: string, value: string | string[]) {
                headers[name] = value;
            },
            send(body: unknown) {
                this.body = body;
            },
        };

        applySerializedBody(response, serialized);
        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({ success: false, message: "nope" });
        expect(headers["content-type"]).toContain("application/json");

        const missing = notFoundBody(handler);
        expect(missing.statusCode).toBe(404);
        expect(handler.notFound().statusCode).toBe(404);
    });
});
