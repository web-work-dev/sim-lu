import { describe, expect, it } from "vitest";

import { Injectable } from "../src/index.js";
import { METADATA_KEYS } from "../src/metadata/keys.js";

describe("Injectable", () => {
    it("should define singleton metadata by default", () => {
        @Injectable()
        class UserService { }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.INJECTABLE,
            UserService,
        );

        expect(metadata).toEqual({
            scope: "singleton",
        });
    });

    it("should support custom scope", () => {
        @Injectable({
            scope: "request",
        })
        class UserService { }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.INJECTABLE,
            UserService,
        );

        expect(metadata).toEqual({
            scope: "request",
        });
    });

    it("should support transient scope", () => {
        @Injectable({
            scope: "transient",
        })
        class UserService { }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.INJECTABLE,
            UserService,
        );

        expect(metadata).toEqual({
            scope: "transient",
        });
    });
});


