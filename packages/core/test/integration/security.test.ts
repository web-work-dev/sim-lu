import { describe, expect, it, beforeAll, afterAll } from "vitest";

import {
    Controller,
    Get,
    Post,
    Module,
    Param,
    Query,
    Body,
    createApplication,
    type ApplicationContext,
} from "@sim-lu/core";
import {
    ok,
    type SuccessResponse,
    type FailureResponse,
} from "@sim-lu/error";
import { ExpressAdapter } from "@sim-lu/platform-express";

@Controller("security")
class SecurityController {
    @Get("/path/:id")
    public pathParam(@Param("id") id: string): SuccessResponse<{ received: string }> {
        return ok({ received: id });
    }

    @Get("/query")
    public query(@Query("q") q: string): SuccessResponse<{ received: string }> {
        return ok({ received: q ?? "none" });
    }

    @Post("/body")
    public body(@Body() data: unknown): SuccessResponse<{ received: unknown }> {
        return ok({ received: data });
    }

    @Get("/safe")
    public safe(): SuccessResponse<{ message: string }> {
        return ok({ message: "safe response" });
    }
}

@Module({
    controllers: [SecurityController],
})
class SecurityModule {}

describe("Security Integration", () => {
    let app: ApplicationContext;
    let adapter: ExpressAdapter;
    let port: number;

    beforeAll(async () => {
        adapter = new ExpressAdapter({
            error: { console: false },
        });
        app = await createApplication(SecurityModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });
        port = adapter.getPort() as number;
    });

    afterAll(async () => {
        await app.close();
    });

    describe("path traversal", () => {
        it("should handle ../ in path params as literal string", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/path/..%2F..%2Fetc%2Fpasswd`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { received: string } };
            expect(typeof body.data.received).toBe("string");
        });

        it("should handle encoded path traversal attempts", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/path/%2e%2e%2f%2e%2e%2fetc%2fpasswd`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { received: string } };
            expect(typeof body.data.received).toBe("string");
        });

        it("should handle null byte injection in path", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/path/test%00`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { received: string } };
            expect(typeof body.data.received).toBe("string");
        });
    });

    describe("SQL injection prevention", () => {
        it("should treat SQL injection in query as literal string", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/query?q=SELECT%20*%20FROM%20users%20WHERE%201=1`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { received: string } };
            expect(body.data.received).toBe("SELECT * FROM users WHERE 1=1");
        });

        it("should handle SQL injection in path params", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/path/1;DROP%20TABLE%20users;--`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { received: string } };
            expect(typeof body.data.received).toBe("string");
        });

        it("should handle UNION-based injection in body", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/body`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    query: "' UNION SELECT username, password FROM users --",
                }),
            });
            expect(res.status).toBe(200);
        });
    });

    describe("XSS prevention", () => {
        it("should treat XSS payload in query as literal string", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/query?q=<script>alert('xss')</script>`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { received: string } };
            expect(body.data.received).toContain("<script>");
        });

        it("should handle XSS in path params without executing", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/path/<img%20onerror=alert(1)>`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { received: string } };
            expect(typeof body.data.received).toBe("string");
        });

        it("should handle XSS in JSON body without executing", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/body`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    content: "<script>document.cookie</script>",
                }),
            });
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { received: { content: string } } };
            expect(body.data.received).toHaveProperty("content");
            expect(body.data.received.content).toContain("<script>");
        });
    });

    describe("error response safety", () => {
        it("should not leak stack traces in production error responses", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/nonexistent`);
            expect(res.status).toBe(404);
            const body = await res.json() as FailureResponse;
            expect(body.stack).toBeUndefined();
            expect(body.error).toBe("Not Found");
        });

        it("should not expose internal file paths in error messages", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/nonexistent`);
            expect(res.status).toBe(404);
            const text = await res.text();
            expect(text).not.toContain("/home/");
            expect(text).not.toContain("\\workdir");
        });

        it("should handle malformed JSON gracefully", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/body`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: "not valid json {{{",
            });
            expect(res.status).toBe(400);
        });

        it("should handle oversized payload keys without crash", async () => {
            const largeKey = "a".repeat(10000);
            const body = { [largeKey]: "value" };

            const res = await fetch(`http://127.0.0.1:${port}/security/body`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
            expect(res.status).toBe(200);
        });

        it("should not echo back server internal state", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/safe`);
            expect(res.status).toBe(200);
            const body = await res.json() as { data: { message: string } };
            expect(body.data.message).toBe("safe response");
        });
    });

    describe("HTTP method restrictions", () => {
        it("should return 404 for unmapped endpoints when using wrong method", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/safe`, {
                method: "DELETE",
            });
            expect(res.status).toBe(404);
        });
    });

    describe("header injection prevention", () => {
        it("should handle newlines in headers without splitting", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/safe`, {
                headers: {
                    "x-custom": "value%0d%0aX-Injected: true",
                },
            });
            expect(res.status).toBe(200);
            expect(res.headers.get("x-injected")).toBeNull();
        });

        it("should not reflect header values in response headers", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/security/safe`, {
                headers: {
                    "referer": "javascript:alert(1)",
                },
            });
            expect(res.status).toBe(200);
            const headers = Object.fromEntries(res.headers.entries());
            expect(JSON.stringify(headers)).not.toContain("javascript:alert");
        });
    });
});
