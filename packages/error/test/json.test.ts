import { describe, expect, it } from "vitest";

import { createSafeReplacer, serializeJson } from "../src/index.js";

describe("serializeJson", () => {
    it("serializes plain objects", () => {
        expect(serializeJson({ ok: true, count: 2 })).toBe("{\"ok\":true,\"count\":2}");
    });

    it("converts bigint values to strings", () => {
        expect(serializeJson({ id: 10n })).toBe("{\"id\":\"10\"}");
    });

    it("omits functions", () => {
        expect(serializeJson({
            name: "ada",
            run: () => undefined,
        })).toBe("{\"name\":\"ada\"}");
    });

    it("serializes Error instances", () => {
        const parsed = JSON.parse(serializeJson(new Error("boom"))) as {
            name: string;
            message: string;
            stack?: string;
        };

        expect(parsed.name).toBe("Error");
        expect(parsed.message).toBe("boom");
        expect(parsed.stack).toContain("Error");
    });

    it("replaces circular references", () => {
        const cyclic: Record<string, unknown> = { name: "root" };
        cyclic.self = cyclic;

        expect(serializeJson(cyclic)).toBe("{\"name\":\"root\",\"self\":\"[Circular]\"}");
    });

    it("uses the fallback when stringify still fails", () => {
        const replacer = createSafeReplacer();
        expect(typeof replacer("key", 1n)).toBe("string");
        expect(serializeJson(undefined)).toBe("{\"success\":false,\"statusCode\":500,\"error\":\"Internal Server Error\",\"message\":\"Failed to serialize error response\"}");
    });
});
