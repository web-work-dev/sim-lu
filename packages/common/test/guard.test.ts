import { describe, expect, it } from "vitest";

import { METADATA_KEYS, UseGuards } from "../src/index.js";

describe("UseGuards", () => {
    it("should store guards on a class decorator", () => {
        class AuthGuard { }

        @UseGuards(AuthGuard)
        class UserController { }

        const guards = Reflect.getMetadata(
            METADATA_KEYS.GUARD,
            UserController,
        );

        expect(guards).toEqual([AuthGuard]);
    });

    it("should store guards on a method decorator", () => {
        class AuthGuard { }

        class UserController {
            @UseGuards(AuthGuard)
            public getUser() { }
        }

        const guards = Reflect.getMetadata(
            METADATA_KEYS.GUARD,
            UserController.prototype,
            "getUser",
        );

        expect(guards).toEqual([AuthGuard]);
    });

    it("should store multiple guards", () => {
        class AuthGuard { }
        class RolesGuard { }

        class UserController {
            @UseGuards(AuthGuard, RolesGuard)
            public getUser() { }
        }

        const guards = Reflect.getMetadata(
            METADATA_KEYS.GUARD,
            UserController.prototype,
            "getUser",
        );

        expect(guards).toEqual([AuthGuard, RolesGuard]);
    });

    it("should accumulate guards across multiple decorators", () => {
        class AuthGuard { }
        class RolesGuard { }

        class UserController {
            @UseGuards(AuthGuard)
            @UseGuards(RolesGuard)
            public getUser() { }
        }

        const guards = Reflect.getMetadata(
            METADATA_KEYS.GUARD,
            UserController.prototype,
            "getUser",
        );

        expect(guards).toEqual([RolesGuard, AuthGuard]);
    });

    it("should keep class and method guards separate", () => {
        class AuthGuard { }
        class RolesGuard { }

        @UseGuards(AuthGuard)
        class UserController {
            @UseGuards(RolesGuard)
            public getUser() { }
        }

        const classGuards = Reflect.getMetadata(
            METADATA_KEYS.GUARD,
            UserController,
        );
        const methodGuards = Reflect.getMetadata(
            METADATA_KEYS.GUARD,
            UserController.prototype,
            "getUser",
        );

        expect(classGuards).toEqual([AuthGuard]);
        expect(methodGuards).toEqual([RolesGuard]);
    });
});
