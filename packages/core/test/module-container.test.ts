import { describe, expect, it } from "vitest";

import {
    ModuleContainer,
} from "../src/module/module-container.js";

import {
    Module,
} from "@sim-lu/common";

describe("ModuleContainer", () => {
    it("registers a module", () => {
        @Module({})
        class AppModule { }

        const container = new ModuleContainer();

        container.register(AppModule);

        expect(container.has(AppModule)).toBe(true);
    });

    it("retrieves module metadata", () => {
        @Module({
            providers: [],
            controllers: [],
        })
        class AppModule { }

        const container = new ModuleContainer();

        container.register(AppModule);

        expect(container.get(AppModule)).toEqual({
            imports: [],
            controllers: [],
            providers: [],
            exports: [],
        });
    });

    it("throws when registering a class without @Module()", () => {
        class NotAModule { }

        const container = new ModuleContainer();

        expect(() => {
            container.register(NotAModule);
        }).toThrow(
            /not decorated with @Module/,
        );
    });

    it("throws when retrieving an unregistered module", () => {
        @Module({})
        class AppModule { }

        const container = new ModuleContainer();

        expect(() => {
            container.get(AppModule);
        }).toThrow(
            /is not registered/,
        );
    });
});