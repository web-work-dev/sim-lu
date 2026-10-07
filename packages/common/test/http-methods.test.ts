import {
    describe,
    expect,
    it,
} from "vitest";

import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Head,
    Options,
    Trace,
    Connect,
    Route,
} from "../src/index.js";

import { METADATA_KEYS } from "../src/metadata/keys.js";

describe("HTTP route decorators", () => {
    it("should define a route using the base Route decorator", () => {
        @Controller("users")
        class UserController {
            @Route("GET", "/custom")
            customRoute() { }
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.ROUTES,
            UserController,
        );

        expect(metadata).toEqual([
            {
                method: "GET",
                path: "/custom",
                handler: "customRoute",
            },
        ]);
    });

    it("should define a GET route", () => {
        @Controller("users")
        class UserController {
            @Get()
            findAll() { }
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.ROUTES,
            UserController,
        );

        expect(metadata).toEqual([
            {
                method: "GET",
                path: "/",
                handler: "findAll",
            },
        ]);
    });

    it("should define a route with a custom path", () => {
        @Controller("users")
        class UserController {
            @Get("/:id")
            findOne() { }
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.ROUTES,
            UserController,
        );

        expect(metadata).toEqual([
            {
                method: "GET",
                path: "/:id",
                handler: "findOne",
            },
        ]);
    });

    it("should define multiple routes", () => {
        @Controller("users")
        class UserController {
            @Get()
            findAll() { }

            @Get("/:id")
            findOne() { }

            @Post()
            create() { }

            @Put("/:id")
            update() { }

            @Patch("/:id")
            patch() { }

            @Delete("/:id")
            remove() { }
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.ROUTES,
            UserController,
        );

        expect(metadata).toEqual([
            {
                method: "GET",
                path: "/",
                handler: "findAll",
            },
            {
                method: "GET",
                path: "/:id",
                handler: "findOne",
            },
            {
                method: "POST",
                path: "/",
                handler: "create",
            },
            {
                method: "PUT",
                path: "/:id",
                handler: "update",
            },
            {
                method: "PATCH",
                path: "/:id",
                handler: "patch",
            },
            {
                method: "DELETE",
                path: "/:id",
                handler: "remove",
            },
        ]);
    });

    it("should support the remaining HTTP methods", () => {
        @Controller("test")
        class TestController {
            @Head()
            head() { }

            @Options()
            options() { }

            @Trace()
            trace() { }

            @Connect()
            connect() { }
        }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.ROUTES,
            TestController,
        );

        expect(metadata).toEqual([
            {
                method: "HEAD",
                path: "/",
                handler: "head",
            },
            {
                method: "OPTIONS",
                path: "/",
                handler: "options",
            },
            {
                method: "TRACE",
                path: "/",
                handler: "trace",
            },
            {
                method: "CONNECT",
                path: "/",
                handler: "connect",
            },
        ]);
    });
});