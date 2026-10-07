import { describe, expect, it } from "vitest";

import { Controller } from "../src/index.js";
import { METADATA_KEYS } from "../src/metadata/keys.js";

describe("Controller", () => {
    it("should define controller metadata", () => {
        @Controller("users")
        class UserController { }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.CONTROLLER,
            UserController,
        );

        expect(metadata).toEqual({
            path: "users",
        });
    });

    it("should use an empty path by default", () => {
        @Controller()
        class UserController { }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.CONTROLLER,
            UserController,
        );

        expect(metadata).toEqual({
            path: "",
        });
    });
});