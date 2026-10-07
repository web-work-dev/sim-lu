import { describe, expect, it, beforeAll, afterAll } from "vitest";

import {
    Controller,
    Get,
    Module,
    Injectable,
    Inject,
    createApplication,
    type ApplicationContext,
    type OnModuleInit,
    type OnApplicationBootstrap,
    type OnModuleDestroy,
} from "@sim-lu/core";
import {
    ok,
    type SuccessResponse,
} from "@sim-lu/error";
import { ExpressAdapter } from "@sim-lu/platform-express";

let lifecycleLog: string[] = [];

@Injectable()
class ConfigService {
    public readonly apiKey = "secret-123";
    public readonly timeout = 5000;

    public getConfig(): { apiKey: string; timeout: number } {
        return { apiKey: this.apiKey, timeout: this.timeout };
    }
}

@Injectable()
class DatabaseService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
    public connected = false;
    public destroyed = false;

    public constructor(
        @Inject(ConfigService) private readonly config: ConfigService,
    ) {}

    public async onModuleInit(): Promise<void> {
        lifecycleLog.push("database-onModuleInit");
        this.connected = true;
    }

    public async onApplicationBootstrap(): Promise<void> {
        lifecycleLog.push("database-onApplicationBootstrap");
    }

    public async onModuleDestroy(): Promise<void> {
        lifecycleLog.push("database-onModuleDestroy");
        this.destroyed = true;
    }

    public getConnectionStatus(): { connected: boolean; apiKey: string } {
        return { connected: this.connected, apiKey: this.config.apiKey };
    }
}

@Injectable()
class UserService {
    public constructor(
        @Inject(DatabaseService) private readonly database: DatabaseService,
    ) {}

    public getDatabase(): DatabaseService {
        return this.database;
    }
}

@Controller("di")
class DiController {
    public constructor(
        @Inject(UserService) private readonly userService: UserService,
        @Inject(ConfigService) private readonly config: ConfigService,
    ) {}

    @Get("/status")
    public getStatus(): SuccessResponse<{ connected: boolean; apiKey: string }> {
        return ok({
            connected: this.userService.getDatabase().connected,
            apiKey: this.config.apiKey,
        });
    }

    @Get("/config")
    public getConfig(): SuccessResponse<{ apiKey: string; timeout: number }> {
        return ok(this.config.getConfig());
    }
}

@Module({
    controllers: [DiController],
    providers: [ConfigService, DatabaseService, UserService],
})
class DimModule {}

describe("DI & Lifecycle Integration", () => {
    describe("dependency injection", () => {
        let app: ApplicationContext;
        let adapter: ExpressAdapter;
        let port: number;

        beforeAll(async () => {
            adapter = new ExpressAdapter({ error: { console: false } });
            app = await createApplication(DimModule, adapter);
            await app.listen({ port: 0, host: "127.0.0.1" });
            port = adapter.getPort() as number;
        });

        afterAll(async () => {
            await app.close();
        });

        it("should inject services through constructor chain", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/di/status`);
            expect(res.status).toBe(200);

            const body = await res.json() as {
                success: boolean;
                data: { connected: boolean; apiKey: string };
            };

            expect(body.success).toBe(true);
            expect(body.data.connected).toBe(true);
            expect(body.data.apiKey).toBe("secret-123");
        });

        it("should inject direct dependency", async () => {
            const res = await fetch(`http://127.0.0.1:${port}/di/config`);
            expect(res.status).toBe(200);

            const body = await res.json() as {
                success: boolean;
                data: { apiKey: string; timeout: number };
            };

            expect(body.success).toBe(true);
            expect(body.data.apiKey).toBe("secret-123");
            expect(body.data.timeout).toBe(5000);
        });

        it("should resolve service via app.get(token)", async () => {
            const config = await app.get<ConfigService>(ConfigService);

            expect(config).toBeInstanceOf(ConfigService);
            expect(config.apiKey).toBe("secret-123");
        });
    });

    describe("lifecycle hooks", () => {
        let lifecycleApp: ApplicationContext;
        let lifecycleAdapter: ExpressAdapter;
        let lifecyclePort: number;
        let lifecycleLogCapture: string[];

        beforeAll(async () => {
            lifecycleLogCapture = [];
            lifecycleAdapter = new ExpressAdapter({ error: { console: false } });

            @Injectable()
            class LifecycleService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
                public async onModuleInit(): Promise<void> {
                    lifecycleLogCapture.push("onModuleInit");
                }

                public async onApplicationBootstrap(): Promise<void> {
                    lifecycleLogCapture.push("onApplicationBootstrap");
                }

                public async onModuleDestroy(): Promise<void> {
                    lifecycleLogCapture.push("onModuleDestroy");
                }
            }

            @Controller("lifecycle")
            class LifecycleController {
                public constructor(
                    @Inject(LifecycleService) private readonly svc: LifecycleService,
                ) {}

                @Get()
                public ping(): SuccessResponse<{ ok: boolean }> {
                    return ok({ ok: true });
                }
            }

            @Module({
                controllers: [LifecycleController],
                providers: [LifecycleService],
            })
            class LifecycleModule {}

            lifecycleApp = await createApplication(LifecycleModule, lifecycleAdapter);
            await lifecycleApp.listen({ port: 0, host: "127.0.0.1" });
            lifecyclePort = lifecycleAdapter.getPort() as number;
        });

        afterAll(async () => {
            await lifecycleApp.close();
        });

        it("should call OnModuleInit and OnApplicationBootstrap during startup", () => {
            expect(lifecycleLogCapture).toContain("onModuleInit");
            expect(lifecycleLogCapture).toContain("onApplicationBootstrap");
            expect(lifecycleLogCapture.indexOf("onModuleInit"))
                .toBeLessThan(lifecycleLogCapture.indexOf("onApplicationBootstrap"));
        });

        it("should call OnModuleDestroy during shutdown", async () => {
            await lifecycleApp.close();
            expect(lifecycleLogCapture).toContain("onModuleDestroy");
        });
    });

    describe("custom providers", () => {
        it("should support useValue provider", async () => {
            const mockConfig = { apiKey: "mock-value", timeout: 999 };

            @Controller("mock")
            class MockController {
                public constructor(
                    @Inject("mock-config") private readonly cfg: typeof mockConfig,
                ) {}

                @Get()
                public get(): SuccessResponse<typeof mockConfig> {
                    return ok(this.cfg);
                }
            }

            @Module({
                controllers: [MockController],
                providers: [
                    { token: "mock-config", useValue: mockConfig },
                ],
            })
            class MockModule {}

            const adapter = new ExpressAdapter({ error: { console: false } });
            const app = await createApplication(MockModule, adapter);
            await app.listen({ port: 0, host: "127.0.0.1" });
            const port = adapter.getPort() as number;

            const res = await fetch(`http://127.0.0.1:${port}/mock`);
            expect(res.status).toBe(200);

            const body = await res.json() as { data: typeof mockConfig };
            expect(body.data).toEqual(mockConfig);

            await app.close();
        });

        it("should support useFactory provider", async () => {
            @Controller("factory")
            class FactoryController {
                public constructor(
                    @Inject("factory-service") private readonly svc: { greet(): string },
                ) {}

                @Get()
                public get(): SuccessResponse<{ greeting: string }> {
                    return ok({ greeting: this.svc.greet() });
                }
            }

            @Module({
                controllers: [FactoryController],
                providers: [
                    {
                        token: "factory-service",
                        useFactory: () => ({ greet: () => "hello-from-factory" }),
                    },
                ],
            })
            class FactoryModule {}

            const adapter = new ExpressAdapter({ error: { console: false } });
            const app = await createApplication(FactoryModule, adapter);
            await app.listen({ port: 0, host: "127.0.0.1" });
            const port = adapter.getPort() as number;

            const res = await fetch(`http://127.0.0.1:${port}/factory`);
            expect(res.status).toBe(200);

            const body = await res.json() as { data: { greeting: string } };
            expect(body.data.greeting).toBe("hello-from-factory");

            await app.close();
        });

        it("should support useClass provider with token", async () => {
            interface GreetingService {
                greet(): string;
            }

            @Injectable()
            class DefaultGreetingService implements GreetingService {
                public greet(): string {
                    return "default";
                }
            }

            @Injectable()
            class OverrideGreetingService implements GreetingService {
                public greet(): string {
                    return "overridden";
                }
            }

            @Controller("greeting")
            class GreetingController {
                public constructor(
                    @Inject("greeting-service") private readonly svc: GreetingService,
                ) {}

                @Get()
                public get(): SuccessResponse<{ greeting: string }> {
                    return ok({ greeting: this.svc.greet() });
                }
            }

            @Module({
                controllers: [GreetingController],
                providers: [
                    { token: "greeting-service", useClass: OverrideGreetingService },
                    DefaultGreetingService,
                ],
            })
            class GreetingModule {}

            const adapter = new ExpressAdapter({ error: { console: false } });
            const app = await createApplication(GreetingModule, adapter);
            await app.listen({ port: 0, host: "127.0.0.1" });
            const port = adapter.getPort() as number;

            const res = await fetch(`http://127.0.0.1:${port}/greeting`);
            expect(res.status).toBe(200);

            const body = await res.json() as { data: { greeting: string } };
            expect(body.data.greeting).toBe("overridden");

            await app.close();
        });
    });

    describe("singleton scope", () => {
        it("should return same instance for singleton providers", async () => {
            @Injectable()
            class CounterService {
                public count = 0;
                public increment(): number {
                    return ++this.count;
                }
            }

            @Controller("counter")
            class CounterController {
                public constructor(
                    @Inject(CounterService) private readonly counter: CounterService,
                ) {}

                @Get()
                public increment(): SuccessResponse<{ count: number }> {
                    return ok({ count: this.counter.increment() });
                }
            }

            @Module({
                controllers: [CounterController],
                providers: [CounterService],
            })
            class CounterModule {}

            const adapter = new ExpressAdapter({ error: { console: false } });
            const app = await createApplication(CounterModule, adapter);
            await app.listen({ port: 0, host: "127.0.0.1" });
            const port = adapter.getPort() as number;

            const res1 = await fetch(`http://127.0.0.1:${port}/counter`);
            const res2 = await fetch(`http://127.0.0.1:${port}/counter`);
            const res3 = await fetch(`http://127.0.0.1:${port}/counter`);

            const b1 = await res1.json() as { data: { count: number } };
            const b2 = await res2.json() as { data: { count: number } };
            const b3 = await res3.json() as { data: { count: number } };

            expect(b1.data.count).toBe(1);
            expect(b2.data.count).toBe(2);
            expect(b3.data.count).toBe(3);

            await app.close();
        });
    });

    describe("transient scope", () => {
        it("should return new instance for each runtime resolve on transient providers", async () => {
            @Injectable({ scope: "transient" })
            class TransientService {
                public readonly id = Math.random();
            }

            @Module({
                providers: [TransientService],
            })
            class TransientModule {}

            const adapter = new ExpressAdapter({ error: { console: false } });
            const app = await createApplication(TransientModule, adapter);

            const ref = app.select(TransientModule);
            const a = await ref.resolve(TransientService);
            const b = await ref.resolve(TransientService);

            expect(a.id).not.toBe(b.id);
            expect(a).not.toBe(b);

            await app.close();
        });

        it("should return same instance when injected into singleton at startup", async () => {
            @Injectable({ scope: "transient" })
            class TransientService {
                public readonly id = Math.random();
            }

            @Injectable()
            class SingletonService {
                public constructor(
                    @Inject(TransientService) private readonly transient: TransientService,
                ) {}

                public getTransientId(): number {
                    return this.transient.id;
                }
            }

            @Controller("transient")
            class TransientController {
                public constructor(
                    @Inject(SingletonService) private readonly singleton: SingletonService,
                    @Inject(TransientService) private readonly transient: TransientService,
                ) {}

                @Get()
                public getIds(): SuccessResponse<{ injectedRef: number; controllerRef: number }> {
                    return ok({
                        injectedRef: this.singleton.getTransientId(),
                        controllerRef: this.transient.id,
                    });
                }
            }

            @Module({
                controllers: [TransientController],
                providers: [SingletonService, TransientService],
            })
            class TransientModule2 {}

            const adapter = new ExpressAdapter({ error: { console: false } });
            const app = await createApplication(TransientModule2, adapter);
            await app.listen({ port: 0, host: "127.0.0.1" });
            const port = adapter.getPort() as number;

            const res1 = await fetch(`http://127.0.0.1:${port}/transient`);
            const res2 = await fetch(`http://127.0.0.1:${port}/transient`);

            const b1 = await res1.json() as { data: { injectedRef: number; controllerRef: number } };
            const b2 = await res2.json() as { data: { injectedRef: number; controllerRef: number } };

            expect(b1.data.injectedRef).toBe(b2.data.injectedRef);
            expect(b1.data.controllerRef).toBe(b2.data.controllerRef);
            expect(b1.data.injectedRef).toBe(b1.data.controllerRef);

            await app.close();
        });
    });

    describe("request scope error", () => {
        it("should throw when resolving a request-scoped provider via Container.resolve()", async () => {
            @Injectable({ scope: "request" })
            class RequestService {}

            @Module({
                providers: [RequestService],
            })
            class RequestModule {}

            const adapter = new ExpressAdapter({ error: { console: false } });
            const app = await createApplication(RequestModule, adapter);

            const ref = app.select(RequestModule);

            await expect(ref.resolve(RequestService)).rejects.toThrow(
                /request-scoped/,
            );

            await app.close();
        });
    });

    describe("custom provider scope", () => {
        it("should support scope on custom class providers", async () => {
            @Injectable({ scope: "transient" })
            class TransientService {
                public readonly id = Math.random();
            }

            @Controller("custom")
            class CustomController {
                public constructor(
                    @Inject(TransientService) private readonly transient: TransientService,
                ) {}

                @Get()
                public getId(): SuccessResponse<{ id: number }> {
                    return ok({ id: this.transient.id });
                }
            }

            @Module({
                controllers: [CustomController],
                providers: [
                    { token: TransientService, useClass: TransientService, scope: "transient" },
                ],
            })
            class CustomScopeModule {}

            const adapter = new ExpressAdapter({ error: { console: false } });
            const app = await createApplication(CustomScopeModule, adapter);
            await app.listen({ port: 0, host: "127.0.0.1" });
            const port = adapter.getPort() as number;

            const res1 = await fetch(`http://127.0.0.1:${port}/custom`);
            const res2 = await fetch(`http://127.0.0.1:${port}/custom`);

            const b1 = await res1.json() as { data: { id: number } };
            const b2 = await res2.json() as { data: { id: number } };

            expect(b1.data.id).toBe(b2.data.id);

            await app.close();
        });

        it("should return new instance for runtime resolve on custom transient provider", async () => {
            @Injectable({ scope: "transient" })
            class TransientService {
                public readonly id = Math.random();
            }

            @Module({
                providers: [
                    { token: TransientService, useClass: TransientService, scope: "transient" },
                ],
            })
            class CustomTransientModule {}

            const adapter = new ExpressAdapter({ error: { console: false } });
            const app = await createApplication(CustomTransientModule, adapter);

            const ref = app.select(CustomTransientModule);
            const a = await ref.resolve(TransientService);
            const b = await ref.resolve(TransientService);

            expect(a.id).not.toBe(b.id);
            expect(a).not.toBe(b);

            await app.close();
        });

        it("transient dependency injected into singleton stays at bootstrap instance", async () => {
            @Injectable({ scope: "transient" })
            class TransientDep {
                public readonly id = Math.random();
            }

            @Injectable()
            class SingletonConsumer {
                public constructor(
                    @Inject(TransientDep) public readonly dep: TransientDep,
                ) {}
            }

            @Module({
                providers: [SingletonConsumer, TransientDep],
            })
            class NestedModule {}

            const adapter = new ExpressAdapter({ error: { console: false } });
            const app = await createApplication(NestedModule, adapter);

            const ref = app.select(NestedModule);

            const singleton1 = await ref.resolve(SingletonConsumer);
            const singleton2 = await ref.resolve(SingletonConsumer);

            const runtimeDep = await ref.resolve(TransientDep);

            expect(singleton1).toBe(singleton2);
            expect(singleton1.dep.id).toBe(singleton2.dep.id);
            expect(runtimeDep.id).not.toBe(singleton1.dep.id);

            await app.close();
        });
    });
});
