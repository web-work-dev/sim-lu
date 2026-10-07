import { describe, expect, it } from "vitest";

import { Inject, Injectable, Module } from "@sim-lu/common";

import {
    ApplicationContext,
    createApplicationContext,
    type ApplicationPlugin,
    type PluginApplication,
} from "../src/index.js";

const COUNTER = Symbol("counter");

@Injectable()
class CounterUser {
    public constructor(
        @Inject(COUNTER)
        public readonly value: number,
    ) { }
}

const counterPlugin: ApplicationPlugin = {
    name: "counter",
    module() {
        return {
            module: class CounterModule { },
            global: true,
            providers: [
                {
                    token: COUNTER,
                    useValue: 7,
                },
            ],
            exports: [COUNTER],
        };
    },
};

describe("application plugins", () => {
    it("injects plugin providers into the application without extra templates", async () => {
        @Module({
            providers: [CounterUser],
        })
        class AppModule { }

        const app = await createApplicationContext(AppModule, {
            plugins: [counterPlugin],
        });

        expect(await app.get(COUNTER)).toBe(7);
        expect((await app.get(CounterUser)).value).toBe(7);
        expect(app.has(COUNTER)).toBe(true);
    });

    it("decorates values after bootstrap like fastify plugins", async () => {
        @Module({})
        class AppModule { }

        const app = await ApplicationContext.create(AppModule);
        const FLAG = Symbol("flag");
        let closed = false;

        await app.register({
            name: "flag",
            async register(target: PluginApplication) {
                target.decorate(FLAG, true);
                target.onClose(() => {
                    closed = true;
                });
            },
        });

        expect(await app.get(FLAG)).toBe(true);
        expect(app.has(FLAG)).toBe(true);

        await app.close();
        expect(closed).toBe(true);
    });

    it("passes options through plugin tuples", async () => {
        const TOKEN = Symbol("named");
        const named: ApplicationPlugin = {
            name: "named",
            register(app, options) {
                app.provide(TOKEN, (options as { value: string }).value);
            },
        };

        @Module({})
        class AppModule { }

        const app = await createApplicationContext(AppModule, {
            plugins: [[named, { value: "ok" }]],
        });

        expect(await app.get(TOKEN)).toBe("ok");
    });
});
