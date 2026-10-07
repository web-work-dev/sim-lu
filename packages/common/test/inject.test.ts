import { describe, expect, it } from "vitest";

import {
    Inject,
    getConstructorDependencies,
    getConstructorParamNames,
    getConstructorTokens,
    matchTokenByParamName,
    METADATA_KEYS,
} from "../src/index.js";

describe("Inject", () => {
    it("stores constructor tokens by parameter index", () => {
        const TOKEN = Symbol("db");

        class UserService {
            public constructor(
                @Inject(TOKEN)
                public readonly database: unknown,
            ) { }
        }

        expect(getConstructorTokens(UserService)).toEqual({
            0: TOKEN,
        });
        expect(Reflect.getMetadata(METADATA_KEYS.CONSTRUCTOR_PARAMS, UserService)).toEqual({
            0: TOKEN,
        });
    });

    it("supports multiple injected tokens", () => {
        const FIRST = "first";
        const SECOND = Symbol("second");

        class Composite {
            public constructor(
                @Inject(FIRST)
                public readonly first: unknown,
                @Inject(SECOND)
                public readonly second: unknown,
            ) { }
        }

        expect(getConstructorTokens(Composite)).toEqual({
            0: FIRST,
            1: SECOND,
        });
    });

    it("returns an empty object when nothing is injected", () => {
        class Empty { }

        expect(getConstructorTokens(Empty)).toEqual({});
    });

    it("reads constructor parameter names from source", () => {
        class Named {
            public constructor(
                public readonly logger: unknown,
                public readonly database: unknown,
            ) { }
        }

        expect(getConstructorParamNames(Named)).toEqual([
            "logger",
            "database",
        ]);
    });

    it("merges explicit tokens with design types", () => {
        const TOKEN = Symbol("db");

        class UserService {
            public constructor(
                @Inject(TOKEN)
                public readonly database: unknown,
            ) { }
        }

        expect(getConstructorDependencies(UserService)[0]).toBe(TOKEN);
    });

    it("matches registered class tokens by constructor parameter name", () => {
        class Logger {}
        class UserService {}

        expect(matchTokenByParamName("logger", [Logger, UserService])).toBe(Logger);
        expect(matchTokenByParamName("_userService", [Logger, UserService])).toBe(UserService);
        expect(matchTokenByParamName("missing", [Logger])).toBeUndefined();
    });
});
