import { describe, expect, it } from "vitest";

import {
    Controller,
    Injectable,
    METADATA_KEYS,
    Module,
    type BeforeApplicationShutdown,
    type OnApplicationBootstrap,
    type OnApplicationShutdown,
    type OnModuleDestroy,
    type OnModuleInit,
} from "@sim-lu/common";

import {
    ApplicationContext,
    createApplicationContext,
} from "../src/application/application-context.js";
import {
    ADAPTER_REQUIRED_MESSAGE,
    createApplication,
} from "../src/application/factory.js";
import { ModuleCompiler } from "../src/application/module-compiler.js";
import { ContainerComposer } from "../src/application/container-composer.js";
import { ModuleRef } from "../src/module/module-ref.js";

describe("Application bootstrap", () => {
    describe("ApplicationContext", () => {
        it("creates and initializes an empty root module", async () => {
            @Module({})
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);

            expect(app.isInitialized()).toBe(true);
            expect(app.getModules().has(AppModule)).toBe(true);
        });

        it("createApplicationContext initializes the same way", async () => {
            @Module({})
            class AppModule {}

            const app = await createApplicationContext(AppModule);

            expect(app.isInitialized()).toBe(true);
        });

        it("createApplication requires choosing express or uws", async () => {
            @Module({})
            class AppModule {}

            await expect(
                createApplication(AppModule, undefined as never),
            ).rejects.toThrow(ADAPTER_REQUIRED_MESSAGE);
        });

        it("init is idempotent", async () => {
            @Module({})
            class AppModule {}

            const app = new ApplicationContext(AppModule);
            const first = await app.init();
            const second = await app.init();

            expect(first).toBe(app);
            expect(second).toBe(app);
            expect(app.getModuleWrappers()).toHaveLength(1);
        });

        it("throws when accessing modules before init", () => {
            @Module({})
            class AppModule {}

            const app = new ApplicationContext(AppModule);

            expect(() => app.getModules()).toThrow(
                /has not been initialized/,
            );
        });

        it("resolves providers registered on the root module", async () => {
            @Injectable()
            class Logger {
                public log(message: string): string {
                    return message;
                }
            }

            @Module({
                providers: [Logger],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);

            expect(await app.get(Logger)).toBeInstanceOf(Logger);
            expect(await app.get(Logger)).toBe(await app.get(Logger));
        });

        it("registers controllers on the module controller registry", async () => {
            @Controller("users")
            class UserController {
                public list(): string {
                    return "users";
                }
            }

            @Module({
                controllers: [UserController],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);
            const wrapper = app.getModuleWrappers()[0];

            expect(wrapper).toBeDefined();
            expect(wrapper?.controllerRegistry?.has(UserController)).toBe(true);
            expect(await app.get(UserController)).toBeInstanceOf(UserController);
        });

        it("injects constructor dependencies within a module", async () => {
            @Injectable()
            class Logger {}

            @Injectable()
            class UserService {
                public constructor(
                    public readonly logger: Logger,
                ) {}
            }

            @Module({
                providers: [Logger, UserService],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);
            const service = await app.get(UserService);

            expect(service.logger).toBeInstanceOf(Logger);
            expect(service.logger).toBe(await app.get(Logger));
        });

        it("injects constructor dependencies without @Injectable", async () => {
            class Logger {}

            class UserService {
                public constructor(
                    public readonly logger: Logger,
                ) {}
            }

            @Module({
                providers: [Logger, UserService],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);
            const service = await app.get(UserService);

            expect(service.logger).toBeInstanceOf(Logger);
            expect(service.logger).toBe(await app.get(Logger));
        });

        it("auto-registers decorator enhancers that are not listed as providers", async () => {
            class AllowGuard {
                public canActivate(): boolean {
                    return true;
                }
            }

            @Controller("users")
            class UserController {
                public list(): string {
                    return "users";
                }
            }

            Reflect.defineMetadata(
                METADATA_KEYS.GUARD,
                [AllowGuard],
                UserController,
            );

            @Module({
                controllers: [UserController],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);

            expect(await app.get(AllowGuard)).toBeInstanceOf(AllowGuard);
        });

        it("injects ModuleRef into a provider", async () => {
            @Injectable()
            class ConfigService {
                public readonly env = "test";
            }

            @Injectable()
            class UserService {
                public constructor(
                    public readonly moduleRef: ModuleRef,
                ) {}
            }

            @Module({
                providers: [ConfigService, UserService],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);
            const service = await app.get(UserService);

            expect(service.moduleRef).toBeInstanceOf(ModuleRef);
            expect(await service.moduleRef.get(ConfigService)).toBeInstanceOf(ConfigService);
        });

        it("selects a compiled module and resolves from its container", async () => {
            @Injectable()
            class FeatureService {}

            @Module({
                providers: [FeatureService],
                exports: [FeatureService],
            })
            class FeatureModule {}

            @Module({
                imports: [FeatureModule],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);
            const selected = app.select(FeatureModule);

            expect(await selected.get(FeatureService)).toBeInstanceOf(FeatureService);
            expect(await selected.get(FeatureService)).toBe(await app.get(FeatureService));
        });

        it("throws when selecting a module that is not part of the application", async () => {
            @Module({})
            class OtherModule {}

            @Module({})
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);

            expect(() => app.select(OtherModule)).toThrow(
                /is not part of the application/,
            );
        });
    });

    describe("module composition", () => {
        it("compiles imported modules depth-first", async () => {
            @Module({})
            class LeafModule {}

            @Module({
                imports: [LeafModule],
            })
            class FeatureModule {}

            @Module({
                imports: [FeatureModule],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);
            const order = app.getModuleWrappers().map((module) => module.metatype);

            expect(order).toEqual([LeafModule, FeatureModule, AppModule]);
            expect(app.getModuleContainer().has(LeafModule)).toBe(true);
            expect(app.getModuleContainer().has(FeatureModule)).toBe(true);
        });

        it("shares a single wrapper when the same module is imported twice", async () => {
            @Module({})
            class SharedModule {}

            @Module({
                imports: [SharedModule],
            })
            class LeftModule {}

            @Module({
                imports: [SharedModule],
            })
            class RightModule {}

            @Module({
                imports: [LeftModule, RightModule],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);
            const wrappers = [...app.getModules().values()].filter(
                (module) => module.metatype === SharedModule,
            );

            expect(app.getModules().size).toBe(4);
            expect(wrappers).toHaveLength(1);
        });

        it("exports a provider to the importing module", async () => {
            @Injectable()
            class SharedService {
                public readonly id = "shared";
            }

            @Module({
                providers: [SharedService],
                exports: [SharedService],
            })
            class SharedModule {}

            @Injectable()
            class AppService {
                public constructor(
                    public readonly shared: SharedService,
                ) {}
            }

            @Module({
                imports: [SharedModule],
                providers: [AppService],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);
            const service = await app.get(AppService);

            expect(service.shared).toBeInstanceOf(SharedService);
            expect(service.shared).toBe(await app.select(SharedModule).get(SharedService));
        });

        it("does not expose a private provider to the importing module", async () => {
            @Injectable()
            class PrivateService {}

            @Module({
                providers: [PrivateService],
            })
            class FeatureModule {}

            @Injectable()
            class AppService {
                public constructor(
                    public readonly privateService: PrivateService,
                ) {}
            }

            @Module({
                imports: [FeatureModule],
                providers: [AppService],
            })
            class AppModule {}

            await expect(
                ApplicationContext.create(AppModule),
            ).rejects.toThrow(/Provider not found for token: PrivateService/);
        });

        it("re-exports an imported module", async () => {
            @Injectable()
            class CoreService {}

            @Module({
                providers: [CoreService],
                exports: [CoreService],
            })
            class CoreModule {}

            @Module({
                imports: [CoreModule],
                exports: [CoreModule],
            })
            class SharedModule {}

            @Injectable()
            class AppService {
                public constructor(
                    public readonly core: CoreService,
                ) {}
            }

            @Module({
                imports: [SharedModule],
                providers: [AppService],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);

            expect((await app.get(AppService)).core).toBe(
                await app.select(CoreModule).get(CoreService),
            );
        });

        it("throws when exporting a token that is not local", async () => {
            @Injectable()
            class MissingService {}

            @Module({
                exports: [MissingService],
            })
            class BrokenModule {}

            const compiler = new ModuleCompiler();
            const compiled = compiler.compile(BrokenModule);
            const composer = new ContainerComposer();

            await expect(composer.compose(compiled)).rejects.toThrow(
                /cannot export "MissingService"/,
            );
        });

        it("fails startup when an async factory rejects", async () => {
            @Module({
                providers: [
                    {
                        token: "ASYNC_FAIL",
                        useFactory: async () => Promise.reject(new Error("async init failed")),
                    },
                ],
            })
            class BrokenAppModule {}

            await expect(
                ApplicationContext.create(BrokenAppModule),
            ).rejects.toThrow("async init failed");
        });

        it("throws when exporting a module that is not imported", async () => {
            @Module({})
            class OtherModule {}

            @Module({
                exports: [OtherModule],
            })
            class BrokenModule {}

            const compiler = new ModuleCompiler();
            const compiled = compiler.compile(BrokenModule);
            const composer = new ContainerComposer();

            await expect(composer.compose(compiled)).rejects.toThrow(
                /cannot export "OtherModule" because it is not imported/,
            );
        });

        it("throws on circular module imports", () => {
            @Module({
                imports: [],
            })
            class ModuleA {}

            @Module({
                imports: [ModuleA],
            })
            class ModuleB {}

            Reflect.defineMetadata(
                METADATA_KEYS.MODULE,
                { imports: [ModuleB] },
                ModuleA,
            );

            const compiler = new ModuleCompiler();

            expect(() => compiler.compile(ModuleA)).toThrow(
                /Circular module import detected/,
            );
        });
    });

    describe("lifecycle", () => {
        it("calls module init then application bootstrap in import order", async () => {
            const events: string[] = [];

            @Injectable()
            class LeafService implements OnModuleInit, OnApplicationBootstrap {
                public onModuleInit(): void {
                    events.push("leaf:init");
                }

                public onApplicationBootstrap(): void {
                    events.push("leaf:bootstrap");
                }
            }

            @Injectable()
            class RootService implements OnModuleInit, OnApplicationBootstrap {
                public onModuleInit(): void {
                    events.push("root:init");
                }

                public onApplicationBootstrap(): void {
                    events.push("root:bootstrap");
                }
            }

            @Module({
                providers: [LeafService],
            })
            class LeafModule {}

            @Module({
                imports: [LeafModule],
                providers: [RootService],
            })
            class AppModule {}

            await ApplicationContext.create(AppModule);

            expect(events).toEqual([
                "leaf:init",
                "root:init",
                "leaf:bootstrap",
                "root:bootstrap",
            ]);
        });

        it("awaits async lifecycle hooks", async () => {
            const events: string[] = [];

            @Injectable()
            class AsyncService implements OnModuleInit, OnApplicationBootstrap {
                public async onModuleInit(): Promise<void> {
                    await Promise.resolve();
                    events.push("init");
                }

                public async onApplicationBootstrap(): Promise<void> {
                    await Promise.resolve();
                    events.push("bootstrap");
                }
            }

            @Module({
                providers: [AsyncService],
            })
            class AppModule {}

            await ApplicationContext.create(AppModule);

            expect(events).toEqual(["init", "bootstrap"]);
        });

        it("calls shutdown hooks in reverse module order", async () => {
            const events: string[] = [];

            @Injectable()
            class LeafService
                implements
                    OnModuleDestroy,
                    BeforeApplicationShutdown,
                    OnApplicationShutdown
            {
                public beforeApplicationShutdown(signal?: string): void {
                    events.push(`leaf:before:${signal ?? ""}`);
                }

                public onModuleDestroy(): void {
                    events.push("leaf:destroy");
                }

                public onApplicationShutdown(signal?: string): void {
                    events.push(`leaf:shutdown:${signal ?? ""}`);
                }
            }

            @Injectable()
            class RootService
                implements
                    OnModuleDestroy,
                    BeforeApplicationShutdown,
                    OnApplicationShutdown
            {
                public beforeApplicationShutdown(signal?: string): void {
                    events.push(`root:before:${signal ?? ""}`);
                }

                public onModuleDestroy(): void {
                    events.push("root:destroy");
                }

                public onApplicationShutdown(signal?: string): void {
                    events.push(`root:shutdown:${signal ?? ""}`);
                }
            }

            @Module({
                providers: [LeafService],
            })
            class LeafModule {}

            @Module({
                imports: [LeafModule],
                providers: [RootService],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);
            await app.close("SIGTERM");

            expect(events).toEqual([
                "root:before:SIGTERM",
                "leaf:before:SIGTERM",
                "root:destroy",
                "leaf:destroy",
                "root:shutdown:SIGTERM",
                "leaf:shutdown:SIGTERM",
            ]);
        });

        it("close is a no-op before init and after the first close", async () => {
            const events: string[] = [];

            @Injectable()
            class Service implements OnApplicationShutdown {
                public onApplicationShutdown(): void {
                    events.push("shutdown");
                }
            }

            @Module({
                providers: [Service],
            })
            class AppModule {}

            const uninitialized = new ApplicationContext(AppModule);
            await uninitialized.close();
            expect(events).toEqual([]);

            const app = await ApplicationContext.create(AppModule);
            await app.close();
            await app.close();

            expect(events).toEqual(["shutdown"]);
        });

        it("does not treat missing lifecycle methods as errors", async () => {
            @Injectable()
            class PlainService {}

            @Module({
                providers: [PlainService],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);

            await expect(app.close()).resolves.toBeUndefined();
        });
    });
});
