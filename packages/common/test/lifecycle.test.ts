import { describe, expect, it } from "vitest";

import type {
    BeforeApplicationShutdown,
    OnApplicationBootstrap,
    OnApplicationShutdown,
    OnModuleDestroy,
    OnModuleInit,
} from "../src/index.js";

describe("lifecycle interfaces", () => {
    it("accepts implementations of every bootstrap hook", async () => {
        class Provider implements
            OnModuleInit,
            OnApplicationBootstrap,
            OnModuleDestroy,
            BeforeApplicationShutdown,
            OnApplicationShutdown {
            public readonly events: string[] = [];

            public onModuleInit(): void {
                this.events.push("init");
            }

            public onApplicationBootstrap(): void {
                this.events.push("bootstrap");
            }

            public onModuleDestroy(): void {
                this.events.push("destroy");
            }

            public beforeApplicationShutdown(signal?: string): void {
                this.events.push(`before:${signal ?? ""}`);
            }

            public onApplicationShutdown(signal?: string): void {
                this.events.push(`shutdown:${signal ?? ""}`);
            }
        }

        const provider = new Provider();
        provider.onModuleInit();
        provider.onApplicationBootstrap();
        provider.beforeApplicationShutdown("SIGTERM");
        provider.onModuleDestroy();
        provider.onApplicationShutdown("SIGTERM");

        expect(provider.events).toEqual([
            "init",
            "bootstrap",
            "before:SIGTERM",
            "destroy",
            "shutdown:SIGTERM",
        ]);
    });
});
