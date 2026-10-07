import { describe, it, expect, beforeEach } from "vitest";
import { Container } from "../src/container/container.js";
import type { InjectToken } from "../src/container/token.js";

// ─── Helpers / Fixtures ───────────────────────────────────────────────────────

/** Minimal decorator that triggers `design:paramtypes` metadata emission. */
function Injectable(): ClassDecorator {
    return (target) => target;
}

// Simple leaf service – no dependencies
@Injectable()
class Logger {
    public log(msg: string): string {
        return `[LOG] ${msg}`;
    }
}

// Service that depends on Logger
@Injectable()
class UserService {
    constructor(public readonly logger: Logger) { }

    public greet(name: string): string {
        return this.logger.log(`Hello, ${name}!`);
    }
}

// Service with multiple dependencies
@Injectable()
class AppService {
    constructor(
        public readonly logger: Logger,
        public readonly users: UserService,
    ) { }
}

// ─── Token fixtures ────────────────────────────────────────────────────────────

const DB_URL_TOKEN: InjectToken<string> = "DATABASE_URL";
const VERSION_TOKEN: InjectToken<number> = Symbol("VERSION");

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Container", () => {
    let container: Container;

    beforeEach(() => {
        container = new Container();
    });

    // ── ValueProvider ─────────────────────────────────────────────────────────

    describe("ValueProvider", () => {
        it("resolves a string value by string token", async () => {
            container.register({
                token: DB_URL_TOKEN,
                useValue: "postgres://localhost:5432/db",
            });

            expect(await container.resolve(DB_URL_TOKEN)).toBe(
                "postgres://localhost:5432/db",
            );
        });

        it("resolves a numeric value by symbol token", async () => {
            container.register({ token: VERSION_TOKEN, useValue: 42 });

            expect(await container.resolve(VERSION_TOKEN)).toBe(42);
        });

        it("resolves a falsy value (0) correctly", async () => {
            const TOKEN: InjectToken<number> = "ZERO";
            container.register({ token: TOKEN, useValue: 0 });

            expect(await container.resolve(TOKEN)).toBe(0);
        });

        it("resolves a falsy value (false) correctly", async () => {
            const TOKEN: InjectToken<boolean> = "FLAG";
            container.register({ token: TOKEN, useValue: false });

            expect(await container.resolve(TOKEN)).toBe(false);
        });

        it("resolves null as a value", async () => {
            const TOKEN: InjectToken<null> = "NULL_TOKEN";
            container.register({ token: TOKEN, useValue: null });

            expect(await container.resolve(TOKEN)).toBeNull();
        });
    });

    // ── FactoryProvider ───────────────────────────────────────────────────────

    describe("FactoryProvider", () => {
        it("calls the factory and returns its result", async () => {
            const TOKEN: InjectToken<Logger> = "FACTORY_LOGGER";
            container.register({
                token: TOKEN,
                useFactory: () => new Logger(),
            });

            const instance = await container.resolve(TOKEN);
            expect(instance).toBeInstanceOf(Logger);
        });

        it("calls the factory on every resolve (no singleton caching)", async () => {
            const TOKEN: InjectToken<Logger> = "FACTORY_LOGGER_2";
            container.register({
                token: TOKEN,
                useFactory: () => new Logger(),
            });

            const a = await container.resolve(TOKEN);
            const b = await container.resolve(TOKEN);

            // Factories are called fresh each time (no caching in Container)
            expect(a).not.toBe(b);
        });

        it("factory can close over external state", async () => {
            let counter = 0;
            const TOKEN: InjectToken<number> = "COUNTER";
            container.register({
                token: TOKEN,
                useFactory: () => ++counter,
            });

            expect(await container.resolve(TOKEN)).toBe(1);
            expect(await container.resolve(TOKEN)).toBe(2);
        });
    });

    // ── ClassProvider (no dependencies) ──────────────────────────────────────

    describe("ClassProvider — no constructor dependencies", () => {
        it("resolves a class by its own constructor as token", async () => {
            container.register({
                token: Logger,
                useClass: Logger,
            });

            const instance = await container.resolve(Logger);
            expect(instance).toBeInstanceOf(Logger);
        });

        it("resolves a class by a string token", async () => {
            const TOKEN: InjectToken<Logger> = "ILogger";
            container.register({ token: TOKEN, useClass: Logger });

            expect(await container.resolve(TOKEN)).toBeInstanceOf(Logger);
        });

        it("resolves a class by a symbol token", async () => {
            const TOKEN: InjectToken<Logger> = Symbol("ILogger");
            container.register({ token: TOKEN, useClass: Logger });

            expect(await container.resolve(TOKEN)).toBeInstanceOf(Logger);
        });
    });

    // ── ClassProvider (automatic constructor injection) ────────────────────────

    describe("ClassProvider — automatic constructor injection via reflect-metadata", () => {
        beforeEach(() => {
            container.register({ token: Logger, useClass: Logger });
            container.register({ token: UserService, useClass: UserService });
            container.register({ token: AppService, useClass: AppService });
        });

        it("injects a single dependency automatically", async () => {
            const svc = await container.resolve(UserService);

            expect(svc).toBeInstanceOf(UserService);
            expect(svc.logger).toBeInstanceOf(Logger);
        });

        it("injected dependency is functional", async () => {
            const svc = await container.resolve(UserService);

            expect(svc.greet("World")).toBe("[LOG] Hello, World!");
        });

        it("injects multiple dependencies automatically", async () => {
            const app = await container.resolve(AppService);

            expect(app).toBeInstanceOf(AppService);
            expect(app.logger).toBeInstanceOf(Logger);
            expect(app.users).toBeInstanceOf(UserService);
        });
    });

    // ── Async FactoryProvider ──────────────────────────────────────────────────

    describe("Async FactoryProvider", () => {
        it("resolves a factory that returns a Promise", async () => {
            const TOKEN: InjectToken<string> = "ASYNC_VALUE";
            container.register({
                token: TOKEN,
                useFactory: () => Promise.resolve("hello"),
            });

            expect(await container.resolve(TOKEN)).toBe("hello");
        });

        it("resolves an async factory with injected dependencies", async () => {
            const DEP_TOKEN: InjectToken<string> = "SYNC_DEP";
            const TOKEN: InjectToken<string> = "ASYNC_WITH_DEP";

            container.register({ token: DEP_TOKEN, useValue: "dep-value" });
            container.register({
                token: TOKEN,
                useFactory: (dep: string) => Promise.resolve(`${dep}-async`),
                inject: [DEP_TOKEN],
            });

            expect(await container.resolve(TOKEN)).toBe("dep-value-async");
        });

        it("propagates a rejected async factory", async () => {
            const TOKEN: InjectToken<string> = "REJECTING_FACTORY";
            container.register({
                token: TOKEN,
                useFactory: () => Promise.reject(new Error("factory failed")),
            });

            await expect(container.resolve(TOKEN)).rejects.toThrow("factory failed");
        });

        it("resolves multiple async providers in dependency order", async () => {
            const TOKEN_A: InjectToken<string> = "ASYNC_A";
            const TOKEN_B: InjectToken<string> = "ASYNC_B";

            container.register({
                token: TOKEN_A,
                useFactory: async () => Promise.resolve("alpha"),
            });
            container.register({
                token: TOKEN_B,
                useFactory: async (a: string) => Promise.resolve(`${a}-beta`),
                inject: [TOKEN_A],
            });

            expect(await container.resolve(TOKEN_A)).toBe("alpha");
            expect(await container.resolve(TOKEN_B)).toBe("alpha-beta");
        });

        it("dependent provider receives the resolved async factory result, not a Promise", async () => {
            @Injectable()
            class ConfigService {
                public readonly apiKey = "resolved-value";
            }

            const TOKEN: InjectToken<ConfigService> = "ASYNC_CONFIG";

            container.register({
                token: TOKEN,
                useFactory: async () => Promise.resolve(new ConfigService()),
            });

            // A class provider that injects the async factory result
            container.register({ token: ConfigService, useFactory: (c: ConfigService) => c, inject: [TOKEN] });

            const resolved = await container.resolve<ConfigService>(ConfigService);

            expect(resolved).toBeInstanceOf(ConfigService);
            expect(resolved.apiKey).toBe("resolved-value");
        });
    });

    // ── has() ─────────────────────────────────────────────────────────────────

    describe("has()", () => {
        it("returns false for an unregistered token", () => {
            expect(container.has(Logger)).toBe(false);
        });

        it("returns true after registration", () => {
            container.register({ token: Logger, useClass: Logger });

            expect(container.has(Logger)).toBe(true);
        });

        it("returns true for string tokens", () => {
            container.register({ token: DB_URL_TOKEN, useValue: "url" });

            expect(container.has(DB_URL_TOKEN)).toBe(true);
        });

        it("returns true for symbol tokens", () => {
            container.register({ token: VERSION_TOKEN, useValue: 1 });

            expect(container.has(VERSION_TOKEN)).toBe(true);
        });
    });

    // ── Error paths ───────────────────────────────────────────────────────────

    describe("Error paths", () => {
        it("throws when resolving an unregistered class token", async () => {
            await expect(container.resolve(Logger)).rejects.toThrowError(
                /Provider not found for token: Logger/,
            );
        });

        it("throws when resolving an unregistered string token", async () => {
            await expect(
                container.resolve<string>("MISSING"),
            ).rejects.toThrowError(/Provider not found for token: MISSING/);
        });

        it("throws when resolving an unregistered symbol token", async () => {
            const sym = Symbol("MISSING_SYM");
            await expect(container.resolve<string>(sym)).rejects.toThrowError(
                /Provider not found for token: Symbol\(MISSING_SYM\)/,
            );
        });

        it("throws when a ClassProvider dependency is not registered", async () => {
            // UserService depends on Logger, but Logger is NOT registered
            container.register({ token: UserService, useClass: UserService });

            await expect(container.resolve(UserService)).rejects.toThrowError(
                /Provider not found for token: Logger/,
            );
        });
    });

    // ── Token overwrite (re-registration) ─────────────────────────────────────

    describe("Re-registration", () => {
        it("last registration wins for the same token", async () => {
            const TOKEN: InjectToken<string> = "OVERWRITE";

            container.register({ token: TOKEN, useValue: "first" });
            container.register({ token: TOKEN, useValue: "second" });

            expect(await container.resolve(TOKEN)).toBe("second");
        });
    });

    // ── Multiple independent containers ──────────────────────────────────────

    describe("Isolation between containers", () => {
        it("two containers do not share registrations", () => {
            const containerA = new Container();
            const containerB = new Container();

            containerA.register({ token: Logger, useClass: Logger });

            expect(containerA.has(Logger)).toBe(true);
            expect(containerB.has(Logger)).toBe(false);
        });
    });
});
