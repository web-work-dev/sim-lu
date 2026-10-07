import { describe, expect, it } from "vitest";

import { METADATA_KEYS, UseInterceptors } from "../src/index.js";

describe("UseInterceptors", () => {
    it("should store interceptors on a class decorator", () => {
        class LoggingInterceptor { }

        @UseInterceptors(LoggingInterceptor)
        class UserController { }

        expect(Reflect.getMetadata(METADATA_KEYS.INTERCEPTOR, UserController)).toEqual([
            LoggingInterceptor,
        ]);
    });

    it("should store interceptors on a method decorator", () => {
        class LoggingInterceptor { }

        class UserController {
            @UseInterceptors(LoggingInterceptor)
            public getUser() { }
        }

        expect(Reflect.getMetadata(
            METADATA_KEYS.INTERCEPTOR,
            UserController.prototype,
            "getUser",
        )).toEqual([LoggingInterceptor]);
    });

    it("should accumulate interceptors across multiple decorators", () => {
        class LoggingInterceptor { }
        class TimingInterceptor { }

        class UserController {
            @UseInterceptors(LoggingInterceptor)
            @UseInterceptors(TimingInterceptor)
            public getUser() { }
        }

        expect(Reflect.getMetadata(
            METADATA_KEYS.INTERCEPTOR,
            UserController.prototype,
            "getUser",
        )).toEqual([TimingInterceptor, LoggingInterceptor]);
    });
});
