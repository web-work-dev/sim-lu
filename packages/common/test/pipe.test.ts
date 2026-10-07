import { describe, expect, it } from "vitest";

import { METADATA_KEYS, UsePipes } from "../src/index.js";

describe("UsePipes", () => {
    it("should store pipes on a class decorator", () => {
        class ParsePipe { }

        @UsePipes(ParsePipe)
        class UserController { }

        expect(Reflect.getMetadata(METADATA_KEYS.PIPE, UserController)).toEqual([ParsePipe]);
    });

    it("should store pipes on a method decorator", () => {
        class ParsePipe { }

        class UserController {
            @UsePipes(ParsePipe)
            public getUser() { }
        }

        expect(Reflect.getMetadata(
            METADATA_KEYS.PIPE,
            UserController.prototype,
            "getUser",
        )).toEqual([ParsePipe]);
    });

    it("should accumulate pipes across multiple decorators", () => {
        class ParsePipe { }
        class TrimPipe { }

        class UserController {
            @UsePipes(ParsePipe)
            @UsePipes(TrimPipe)
            public getUser() { }
        }

        expect(Reflect.getMetadata(
            METADATA_KEYS.PIPE,
            UserController.prototype,
            "getUser",
        )).toEqual([TrimPipe, ParsePipe]);
    });
});
