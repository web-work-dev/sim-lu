import { describe, expect, it } from "vitest";

import {
    extractParamNames,
    MutableHttpResponse,
    parseCookies,
    parseQuery,
    serializeBody,
} from "../src/index.js";

describe("http utilities", () => {
    it("parses empty, repeated, and decoded query values", () => {
        expect(parseQuery("")).toEqual({});
        expect(parseQuery("?")).toEqual({});
        expect(parseQuery("name=ada+lovelace&empty=&tag=a&tag=b&tag=c")).toEqual({
            name: "ada lovelace",
            empty: "",
            tag: ["a", "b", "c"],
        });
        expect(parseQuery("q=%2Fusers%2F1")).toEqual({
            q: "/users/1",
        });
    });

    it("parses cookies and ignores malformed pairs", () => {
        expect(parseCookies(undefined)).toEqual({});
        expect(parseCookies("")).toEqual({});
        expect(parseCookies("sid=abc; broken; theme=dark")).toEqual({
            sid: "abc",
            theme: "dark",
        });
    });

    it("extracts colon path parameters", () => {
        expect(extractParamNames("/users/:id/posts/:postId")).toEqual(["id", "postId"]);
        expect(extractParamNames("/health")).toEqual([]);
    });

    it("serializes null, string, and object bodies", () => {
        expect(serializeBody(undefined)).toEqual({ payload: "", contentType: undefined });
        expect(serializeBody(null)).toEqual({ payload: "", contentType: undefined });
        expect(serializeBody("pong")).toEqual({
            payload: "pong",
            contentType: "text/plain; charset=utf-8",
        });
        expect(serializeBody({ ok: true })).toEqual({
            payload: "{\"ok\":true}",
            contentType: "application/json; charset=utf-8",
        });
    });

    it("mutates status, headers, body, and cookies on MutableHttpResponse", () => {
        const response = new MutableHttpResponse();

        response.setStatus(201).setHeader("X-Trace", "1").send({ id: 9 });
        response.setCookie("sid", "abc");
        response.setCookie("tmp", "1");
        response.clearCookie("tmp");

        expect(response.status).toBe(201);
        expect(response.headers["x-trace"]).toBe("1");
        expect(response.body).toEqual({ id: 9 });
        expect(response.cookies).toEqual({ sid: "abc" });
    });
});
