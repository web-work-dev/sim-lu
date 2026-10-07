import { describe, expect, it } from "vitest";

import { Catch, METADATA_KEYS, UseFilters } from "../src/index.js";

describe("UseFilters", () => {
    it("should store filters on a class decorator", () => {
        class HttpExceptionFilter { }

        @UseFilters(HttpExceptionFilter)
        class UserController { }

        const filters = Reflect.getMetadata(
            METADATA_KEYS.EXCEPTION_FILTER,
            UserController,
        );

        expect(filters).toEqual([HttpExceptionFilter]);
    });

    it("should store filters on a method decorator", () => {
        class HttpExceptionFilter { }

        class UserController {
            @UseFilters(HttpExceptionFilter)
            public getUser() { }
        }

        const filters = Reflect.getMetadata(
            METADATA_KEYS.EXCEPTION_FILTER,
            UserController.prototype,
            "getUser",
        );

        expect(filters).toEqual([HttpExceptionFilter]);
    });

    it("should store multiple filters", () => {
        class HttpExceptionFilter { }
        class ValidationExceptionFilter { }

        class UserController {
            @UseFilters(HttpExceptionFilter, ValidationExceptionFilter)
            public getUser() { }
        }

        const filters = Reflect.getMetadata(
            METADATA_KEYS.EXCEPTION_FILTER,
            UserController.prototype,
            "getUser",
        );

        expect(filters).toEqual([
            HttpExceptionFilter,
            ValidationExceptionFilter,
        ]);
    });

    it("should accumulate filters across multiple decorators", () => {
        class HttpExceptionFilter { }
        class ValidationExceptionFilter { }

        class UserController {
            @UseFilters(HttpExceptionFilter)
            @UseFilters(ValidationExceptionFilter)
            public getUser() { }
        }

        const filters = Reflect.getMetadata(
            METADATA_KEYS.EXCEPTION_FILTER,
            UserController.prototype,
            "getUser",
        );

        expect(filters).toEqual([
            ValidationExceptionFilter,
            HttpExceptionFilter,
        ]);
    });

    it("should keep class and method filters separate", () => {
        class HttpExceptionFilter { }
        class ValidationExceptionFilter { }

        @UseFilters(HttpExceptionFilter)
        class UserController {
            @UseFilters(ValidationExceptionFilter)
            public getUser() { }
        }

        const classFilters = Reflect.getMetadata(
            METADATA_KEYS.EXCEPTION_FILTER,
            UserController,
        );
        const methodFilters = Reflect.getMetadata(
            METADATA_KEYS.EXCEPTION_FILTER,
            UserController.prototype,
            "getUser",
        );

        expect(classFilters).toEqual([HttpExceptionFilter]);
        expect(methodFilters).toEqual([ValidationExceptionFilter]);
    });
});

describe("Catch", () => {
    it("should store exception types on a filter class", () => {
        class HttpException { }

        @Catch(HttpException)
        class HttpExceptionFilter { }

        const types = Reflect.getMetadata(
            METADATA_KEYS.CATCH,
            HttpExceptionFilter,
        );

        expect(types).toEqual([HttpException]);
    });

    it("should store multiple exception types", () => {
        class HttpException { }
        class ValidationException { }

        @Catch(HttpException, ValidationException)
        class CombinedFilter { }

        const types = Reflect.getMetadata(
            METADATA_KEYS.CATCH,
            CombinedFilter,
        );

        expect(types).toEqual([HttpException, ValidationException]);
    });

    it("should store an empty type list when Catch has no arguments", () => {
        @Catch()
        class CatchAllFilter { }

        const types = Reflect.getMetadata(
            METADATA_KEYS.CATCH,
            CatchAllFilter,
        );

        expect(types).toEqual([]);
    });
});
