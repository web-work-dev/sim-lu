import { describe, expect, it } from "vitest";

import {
    BadRequestException,
    HttpStatus,
    created,
    fail,
    fromHttpException,
    noContent,
    normalizeError,
    ok,
    toErrorBody,
    toFailureResponse,
} from "../src/index.js";

describe("response envelopes", () => {
    it("builds success payloads", () => {
        expect(ok({ id: 1 })).toEqual({
            success: true,
            statusCode: 200,
            data: { id: 1 },
        });
        expect(ok("pong", HttpStatus.ACCEPTED, { trace: "1" })).toEqual({
            success: true,
            statusCode: 202,
            data: "pong",
            meta: { trace: "1" },
        });
        expect(created({ id: 2 })).toEqual({
            success: true,
            statusCode: 201,
            data: { id: 2 },
        });
        expect(noContent()).toEqual({
            success: true,
            statusCode: 204,
            data: null,
        });
    });

    it("builds failure payloads", () => {
        expect(fail(400, "bad", { field: "name" })).toEqual({
            success: false,
            statusCode: 400,
            error: "Bad Request",
            message: "bad",
            details: { field: "name" },
        });
        expect(fail(500, "boom")).toEqual({
            success: false,
            statusCode: 500,
            error: "Internal Server Error",
            message: "boom",
        });
    });

    it("normalizes HttpException, Error, and unknown values", () => {
        const http = normalizeError(new BadRequestException("invalid", {
            details: ["name"],
        }));
        expect(http.statusCode).toBe(400);
        expect(http.details).toEqual(["name"]);
        expect(http.name).toBe("BadRequestException");

        const runtime = normalizeError(new Error("explode"));
        expect(runtime.statusCode).toBe(500);
        expect(runtime.message).toBe("explode");
        expect(runtime.stack).toContain("Error");

        const unknown = normalizeError({ nested: true });
        expect(unknown.statusCode).toBe(500);
        expect(unknown.name).toBe("UnknownError");
        expect(unknown.details).toEqual({ nested: true });

        const empty = normalizeError(new Error(""));
        expect(empty.message).toBe("Internal Server Error");

        const rawString = normalizeError("plain failure");
        expect(rawString.message).toBe("plain failure");
        expect(rawString.statusCode).toBe(500);
    });

    it("converts exceptions into API bodies", () => {
        const exception = new BadRequestException("invalid email", {
            details: { field: "email" },
        });

        expect(toErrorBody(exception)).toEqual({
            statusCode: 400,
            error: "Bad Request",
            message: "invalid email",
            details: { field: "email" },
        });
        expect(toErrorBody(exception, false)).toEqual({
            statusCode: 400,
            error: "Bad Request",
            message: "invalid email",
        });
        expect(toFailureResponse(exception)).toEqual({
            success: false,
            statusCode: 400,
            error: "Bad Request",
            message: "invalid email",
            details: { field: "email" },
        });
        expect(fromHttpException(exception).statusCode).toBe(400);
    });
});
