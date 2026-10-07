import { describe, expect, it } from "vitest";

import { METADATA_KEYS, UseTransformers } from "../src/index.js";

describe("UseTransformers", () => {
    it("should store transformers on a class decorator", () => {
        class SerializeTransformer { }

        @UseTransformers(SerializeTransformer)
        class UserController { }

        const transformers = Reflect.getMetadata(
            METADATA_KEYS.TRANSFORM,
            UserController,
        );

        expect(transformers).toEqual([SerializeTransformer]);
    });

    it("should store transformers on a method decorator", () => {
        class SerializeTransformer { }

        class UserController {
            @UseTransformers(SerializeTransformer)
            public getUser() { }
        }

        const transformers = Reflect.getMetadata(
            METADATA_KEYS.TRANSFORM,
            UserController.prototype,
            "getUser",
        );

        expect(transformers).toEqual([SerializeTransformer]);
    });

    it("should store multiple transformers", () => {
        class SerializeTransformer { }
        class WrapTransformer { }

        class UserController {
            @UseTransformers(SerializeTransformer, WrapTransformer)
            public getUser() { }
        }

        const transformers = Reflect.getMetadata(
            METADATA_KEYS.TRANSFORM,
            UserController.prototype,
            "getUser",
        );

        expect(transformers).toEqual([
            SerializeTransformer,
            WrapTransformer,
        ]);
    });

    it("should accumulate transformers across multiple decorators", () => {
        class SerializeTransformer { }
        class WrapTransformer { }

        class UserController {
            @UseTransformers(SerializeTransformer)
            @UseTransformers(WrapTransformer)
            public getUser() { }
        }

        const transformers = Reflect.getMetadata(
            METADATA_KEYS.TRANSFORM,
            UserController.prototype,
            "getUser",
        );

        expect(transformers).toEqual([
            WrapTransformer,
            SerializeTransformer,
        ]);
    });

    it("should keep class and method transformers separate", () => {
        class SerializeTransformer { }
        class WrapTransformer { }

        @UseTransformers(SerializeTransformer)
        class UserController {
            @UseTransformers(WrapTransformer)
            public getUser() { }
        }

        const classTransformers = Reflect.getMetadata(
            METADATA_KEYS.TRANSFORM,
            UserController,
        );
        const methodTransformers = Reflect.getMetadata(
            METADATA_KEYS.TRANSFORM,
            UserController.prototype,
            "getUser",
        );

        expect(classTransformers).toEqual([SerializeTransformer]);
        expect(methodTransformers).toEqual([WrapTransformer]);
    });
});
