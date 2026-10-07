import { describe, expect, it } from "vitest";

import { joinPaths, matchPath, pathSpecificity } from "../src/index.js";

describe("joinPaths", () => {
    it("joins controller and method paths", () => {
        expect(joinPaths("users", ":id")).toBe("/users/:id");
        expect(joinPaths("/users/", "/:id/")).toBe("/users/:id");
        expect(joinPaths("", "")).toBe("/");
        expect(joinPaths("/")).toBe("/");
        expect(joinPaths("api", "v1", "health")).toBe("/api/v1/health");
    });
});

describe("matchPath", () => {
    it("matches exact paths with empty params", () => {
        expect(matchPath("/users", "/users")).toEqual({});
        expect(matchPath("/", "/")).toEqual({});
    });

    it("extracts colon path parameters from request paths", () => {
        expect(matchPath("/users/:id", "/users/42")).toEqual({ id: "42" });
        expect(matchPath("/users/:id/posts/:postId", "/users/ada/posts/7")).toEqual({
            id: "ada",
            postId: "7",
        });
    });

    it("decodes URI segments", () => {
        expect(matchPath("/users/:name", "/users/ada%20lovelace")).toEqual({
            name: "ada lovelace",
        });
    });

    it("rejects mismatched static segments and lengths", () => {
        expect(matchPath("/users/:id", "/posts/42")).toBeUndefined();
        expect(matchPath("/users/:id", "/users/42/extra")).toBeUndefined();
        expect(matchPath("/users/:id/edit", "/users/42")).toBeUndefined();
    });

    it("captures a trailing wildcard", () => {
        expect(matchPath("/files/*", "/files/a/b/c")).toEqual({
            "*": "a/b/c",
        });
        expect(matchPath("/files/*", "/files")).toEqual({
            "*": "",
        });
        expect(matchPath("/files/*", "/other")).toBeUndefined();
    });
});

describe("pathSpecificity", () => {
    it("scores static segments higher than params and wildcards", () => {
        expect(pathSpecificity("/users/list")).toBeGreaterThan(pathSpecificity("/users/:id"));
        expect(pathSpecificity("/users/:id")).toBeGreaterThan(pathSpecificity("/files/*"));
    });
});
