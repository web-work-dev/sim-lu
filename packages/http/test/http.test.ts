import { describe, expect, it } from "vitest";

import type {
    HttpConnection,
    HttpRequest,
    HttpResponse,
    CookieOptions,
    ExecutionContext,
} from "../src/index.js";

describe("HttpRequest", () => {
    it("should satisfy the HttpRequest interface", () => {
        const connection: HttpConnection = {
            remoteAddress: "127.0.0.1",
            remotePort: 54321,
        };

        const request: HttpRequest = {
            method: "GET",
            url: "/users/1",
            headers: { "content-type": "application/json" },
            query: { page: "1" },
            params: { id: "1" },
            body: null,
            cookies: { session: "abc123" },
            ip: "127.0.0.1",
            userAgent: "Mozilla/5.0",
            connection,
        };

        expect(request.method).toBe("GET");
        expect(request.url).toBe("/users/1");
        expect(request.params["id"]).toBe("1");
        expect(request.query["page"]).toBe("1");
        expect(request.ip).toBe("127.0.0.1");
        expect(request.connection.remoteAddress).toBe("127.0.0.1");
        expect(request.connection.remotePort).toBe(54321);
    });
});

describe("HttpResponse", () => {
    it("should satisfy the HttpResponse interface", () => {
        const cookies: Record<string, string | undefined> = {};
        const headers: Record<string, string | undefined> = {};

        const response: HttpResponse = {
            status: 200,
            headers,
            body: { message: "ok" },
            cookies,
            setCookie: (name, value, _options?: CookieOptions) => {
                cookies[name] = value;
            },
            clearCookie: (name, _options?: CookieOptions) => {
                delete cookies[name];
            },
        };

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: "ok" });

        response.setCookie("token", "xyz");
        expect(cookies["token"]).toBe("xyz");

        response.clearCookie("token");
        expect(cookies["token"]).toBeUndefined();
    });
});

describe("ExecutionContext", () => {
    it("should satisfy the ExecutionContext interface for http", () => {
        const ctx: ExecutionContext = {
            type: "http",
            request: {},
            response: {},
            controller: class UserController { },
            handler: "findAll",
            state: new Map(),
        };

        expect(ctx.type).toBe("http");
        expect(ctx.handler).toBe("findAll");
        expect(ctx.state).toBeInstanceOf(Map);
    });

    it("should satisfy the ExecutionContext interface for websocket", () => {
        const ctx: ExecutionContext = {
            type: "websocket",
            request: {},
            response: {},
            controller: class ChatGateway { },
            handler: Symbol("message"),
            state: new Map([["userId", "42"]]),
        };

        expect(ctx.type).toBe("websocket");
        expect(ctx.state.get("userId")).toBe("42");
    });
});
