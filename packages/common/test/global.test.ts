import { describe, expect, it } from "vitest";

import { Global, isGlobalModule, METADATA_KEYS, Module } from "../src/index.js";

describe("Global", () => {
    it("marks a module as global", () => {
        @Global()
        @Module({})
        class ConfigModule { }

        expect(Reflect.getMetadata(METADATA_KEYS.GLOBAL_MODULE, ConfigModule)).toBe(true);
        expect(isGlobalModule(ConfigModule)).toBe(true);
    });

    it("returns false for modules without the decorator", () => {
        @Module({})
        class LocalModule { }

        expect(isGlobalModule(LocalModule)).toBe(false);
    });
});
