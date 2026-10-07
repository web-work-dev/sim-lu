import { describe, expect, it } from "vitest";

import {
    BadRequestException,
    DefaultExceptionFilter,
    createDefaultExceptionFilter,
    type SerializedBody,
    type FailureResponse,
} from "../src/index.js";

describe("DefaultExceptionFilter", () => {
    it("returns a SerializedBody for http exceptions", () => {
        const filter = createDefaultExceptionFilter({
            console: false,
            silent: true,
        });
        const result = filter.catch(new BadRequestException("invalid", {
            details: { field: "id" },
        }));

        expect(result).toEqual({
            payload: JSON.stringify({
                success: false,
                statusCode: 400,
                error: "Bad Request",
                message: "invalid",
                details: { field: "id" },
            }),
            contentType: "application/json; charset=utf-8",
            statusCode: 400,
            headers: {
                "content-type": "application/json; charset=utf-8",
            },
        });
        expect(filter.getHandler()).toBeDefined();
    });

    it("does not write to the context response", () => {
        const filter = new DefaultExceptionFilter({
            console: false,
            silent: true,
        });
        const headers: Record<string, string | string[]> = {};
        let sendCalled = false;
        const response = {
            status: 200,
            body: undefined as unknown,
            setHeader(_name: string, _value: string | string[]) {
                headers[_name] = _value;
            },
            send(body: unknown) {
                sendCalled = true;
                this.body = body;
            },
        };
        const context = {
            get<T>(key: string): T | undefined {
                if (key === "response") {
                    return response as T;
                }

                if (key === "request") {
                    return { method: "GET", url: "/x" } as T;
                }

                return undefined;
            },
        };

        const result = filter.catch(new BadRequestException("nope"), context);

        expect(sendCalled).toBe(false);
        expect(response.status).toBe(200);
        expect(response.body).toBeUndefined();
        expect(result.statusCode).toBe(400);
    });

    it("returns SerializedBody that RequestExecutor applies", () => {
        const filter = new DefaultExceptionFilter({
            console: false,
            silent: true,
        });
        const result = filter.catch(new BadRequestException("bad"));

        expect(result.statusCode).toBe(400);
        expect(result.contentType).toBe("application/json; charset=utf-8");

        const parsedBody = JSON.parse(result.payload) as FailureResponse;
        expect(parsedBody.success).toBe(false);
        expect(parsedBody.statusCode).toBe(400);
        expect(parsedBody.message).toBe("bad");
    });

    it("includes custom headers from HttpException in the SerializedBody", () => {
        const filter = new DefaultExceptionFilter({
            console: false,
            silent: true,
        });
        const result = filter.catch(
            new BadRequestException("with header", { headers: { "x-custom": "value" } }),
        );

        expect(result.headers["x-custom"]).toBe("value");
    });

    it("includes stack trace in payload when includeStack is enabled", () => {
        const filter = new DefaultExceptionFilter({
            console: false,
            silent: true,
            includeStack: true,
        });
        const error = new Error("stack test");
        const result = filter.catch(error);

        const parsedBody = JSON.parse(result.payload) as { stack?: string };
        expect(parsedBody.stack).toBeDefined();
        expect(parsedBody.stack).toContain("stack test");
    });

    it("does not include stack trace when includeStack is disabled", () => {
        const filter = new DefaultExceptionFilter({
            console: false,
            silent: true,
            includeStack: false,
        });
        const result = filter.catch(new Error("no stack"));

        const parsedBody = JSON.parse(result.payload) as { stack?: string };
        expect(parsedBody.stack).toBeUndefined();
    });

    it("serializes generic errors as 500", () => {
        const filter = new DefaultExceptionFilter({
            console: false,
            silent: true,
        });
        const result = filter.catch(new Error("unexpected"));

        expect(result.statusCode).toBe(500);
        expect(result.headers["content-type"]).toContain("application/json");

        const parsedBody = JSON.parse(result.payload) as FailureResponse;
        expect(parsedBody.success).toBe(false);
        expect(parsedBody.error).toBe("Internal Server Error");
        expect(parsedBody.message).toBe("unexpected");
    });

    it("respects includeDetails=false by omitting details", () => {
        const filter = new DefaultExceptionFilter({
            console: false,
            silent: true,
            includeDetails: false,
        });
        const result = filter.catch(
            new BadRequestException("no details", { details: { secret: "hidden" } }),
        );

        const parsedBody = JSON.parse(result.payload) as FailureResponse;
        expect(parsedBody.details).toBeUndefined();
    });
});
