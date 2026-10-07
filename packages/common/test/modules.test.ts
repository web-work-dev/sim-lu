import {
    describe,
    expect,
    it,
} from "vitest";

import {
    Controller,
    Injectable,
    Module,
} from "../src/index.js";

import { METADATA_KEYS } from "../src/metadata/keys.js";

describe("Module", () => {
    it("should define module metadata", () => {
        @Injectable()
        class UserService { }

        @Controller("users")
        class UserController { }

        @Module({
            controllers: [
                UserController,
            ],
            providers: [
                UserService,
            ],
        })
        class UserModule { }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.MODULE,
            UserModule,
        );

        expect(metadata).toEqual({
            controllers: [
                UserController,
            ],
            providers: [
                UserService,
            ],
        });
    });

    it("should allow an empty module", () => {
        @Module()
        class EmptyModule { }

        const metadata = Reflect.getMetadata(
            METADATA_KEYS.MODULE,
            EmptyModule,
        );

        expect(metadata).toEqual({});
    });
});