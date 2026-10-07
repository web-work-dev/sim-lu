import { describe, expect, it } from "vitest";

import {
    Controller,
    Get,
    Module,
    On,
    OnClose,
    OnMessage,
    OnOpen,
    Post,
    WebSocket,
} from "@sim-lu/common";

import { ApplicationContext } from "../src/application/application-context.js";
import { ControllerRef } from "../src/controller/controller-ref.js";
import { joinPaths } from "../src/router/path.js";
import { RouteExplorer } from "../src/router/route-explorer.js";
import { RouteRegistry } from "../src/router/route-registry.js";

describe("Route discovery", () => {
    describe("joinPaths", () => {
        it("returns slash for empty parts", () => {
            expect(joinPaths()).toBe("/");
            expect(joinPaths("", "/")).toBe("/");
        });

        it("joins controller and method paths", () => {
            expect(joinPaths("users", "/")).toBe("/users");
            expect(joinPaths("/users", "/:id")).toBe("/users/:id");
            expect(joinPaths("api/", "/users/", "/:id")).toBe("/api/users/:id");
        });

        it("collapses duplicate slashes", () => {
            expect(joinPaths("//api//", "///users")).toBe("/api/users");
        });
    });

    describe("RouteExplorer", () => {
        it("joins controller prefix with route path", () => {
            @Controller("users")
            class UserController {
                @Get()
                public list(): string {
                    return "list";
                }

                @Get("/:id")
                public find(): string {
                    return "find";
                }

                @Post("/")
                public create(): string {
                    return "create";
                }
            }

            const explorer = new RouteExplorer();
            const ref = new ControllerRef(UserController, new UserController());
            const routes = explorer.exploreHttp(ref);

            expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual([
                "GET /users",
                "GET /users/:id",
                "POST /users",
            ]);
            expect(routes[0]?.controllerPath).toBe("users");
            expect(routes[1]?.routePath).toBe("/:id");
            expect(routes[0]?.handler.invoke()).toBe("list");
        });

        it("uses slash when the controller has no prefix", () => {
            @Controller()
            class RootController {
                @Get()
                public health(): string {
                    return "ok";
                }
            }

            const explorer = new RouteExplorer();
            const ref = new ControllerRef(RootController, new RootController());
            const [route] = explorer.exploreHttp(ref);

            expect(route?.path).toBe("/");
            expect(route?.method).toBe("GET");
        });

        it("returns no HTTP routes when none are decorated", () => {
            @Controller("empty")
            class EmptyController {}

            const explorer = new RouteExplorer();
            const ref = new ControllerRef(EmptyController, new EmptyController());

            expect(explorer.exploreHttp(ref)).toEqual([]);
            expect(explorer.explore(ref)).toEqual([]);
        });

        it("discovers websocket events from a gateway", () => {
            @WebSocket("/chat", "chat.v1")
            class ChatGateway {
                @OnOpen()
                public open(): string {
                    return "open";
                }

                @OnMessage()
                public message(): string {
                    return "message";
                }

                @OnClose()
                public close(): string {
                    return "close";
                }

                @On("typing")
                public typing(): string {
                    return "typing";
                }
            }

            const explorer = new RouteExplorer();
            const ref = new ControllerRef(ChatGateway, new ChatGateway());
            const routes = explorer.exploreWebSocket(ref);

            expect(routes.map((route) => `${route.event} ${route.path}`)).toEqual([
                "$open /chat",
                "$message /chat",
                "$close /chat",
                "typing /chat",
            ]);
            expect(routes[0]?.gateway).toEqual({
                path: "/chat",
                subprotocol: "chat.v1",
            });
            expect(routes[1]?.handler.invoke()).toBe("message");
        });

        it("falls back to the controller path for websocket events", () => {
            @Controller("ws")
            class LiveController {
                @OnMessage()
                public onMessage(): string {
                    return "message";
                }
            }

            const explorer = new RouteExplorer();
            const ref = new ControllerRef(LiveController, new LiveController());
            const [route] = explorer.exploreWebSocket(ref);

            expect(route?.path).toBe("/ws");
            expect(route?.event).toBe("$message");
            expect(route?.gateway).toBeUndefined();
        });
    });

    describe("RouteRegistry", () => {
        it("registers controllers and matches HTTP routes", () => {
            @Controller("users")
            class UserController {
                @Get("/:id")
                public find(): string {
                    return "user";
                }
            }

            const registry = new RouteRegistry();
            const ref = new ControllerRef(UserController, new UserController());

            registry.registerController(ref);

            expect(registry.getHttpRoutes()).toHaveLength(1);
            expect(registry.matchHttp("GET", "/users/:id")?.handler.method).toBe("find");
            expect(registry.matchHttp("GET", "/users/42")?.handler.method).toBe("find");
            expect(registry.matchHttpRequest("GET", "/users/42")).toEqual({
                route: registry.getHttpRoutes()[0],
                params: { id: "42" },
            });
            expect(registry.matchHttp("POST", "/users/:id")).toBeUndefined();
        });

        it("prefers exact routes over parameterized routes", () => {
            @Controller("users")
            class UserController {
                @Get("/me")
                public me(): string {
                    return "me";
                }

                @Get("/:id")
                public find(): string {
                    return "user";
                }
            }

            const registry = new RouteRegistry();
            registry.registerController(
                new ControllerRef(UserController, new UserController()),
            );

            expect(registry.matchHttp("GET", "/users/me")?.handler.method).toBe("me");
            expect(registry.matchHttpRequest("GET", "/users/me")?.params).toEqual({});
            expect(registry.matchHttpRequest("GET", "/users/42")).toMatchObject({
                params: { id: "42" },
            });
            expect(registry.matchHttpRequest("GET", "/users/42")?.route.handler.method).toBe("find");
        });
    });

    describe("ApplicationContext", () => {
        it("discovers HTTP routes from bootstrapped modules", async () => {
            @Controller("users")
            class UserController {
                @Get()
                public list(): string {
                    return "users";
                }

                @Get("/:id")
                public find(): string {
                    return "user";
                }
            }

            @Module({
                controllers: [UserController],
            })
            class UserModule {}

            @Controller()
            class HealthController {
                @Get("health")
                public health(): string {
                    return "ok";
                }
            }

            @Module({
                imports: [UserModule],
                controllers: [HealthController],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);
            const routes = app.getHttpRoutes();

            expect(routes.map((route) => `${route.method} ${route.path}`)).toEqual([
                "GET /users",
                "GET /users/:id",
                "GET /health",
            ]);
            expect(app.getRoutes()).toHaveLength(3);
            expect(app.getRouteRegistry().matchHttp("GET", "/health")?.handler.invoke()).toBe("ok");
        });

        it("discovers websocket routes from imported modules", async () => {
            @WebSocket("/live")
            class LiveGateway {
                @OnMessage()
                public onMessage(): string {
                    return "pong";
                }
            }

            @Module({
                controllers: [LiveGateway],
            })
            class LiveModule {}

            @Module({
                imports: [LiveModule],
            })
            class AppModule {}

            const app = await ApplicationContext.create(AppModule);
            const [route] = app.getWebSocketRoutes();

            expect(app.getWebSocketRoutes()).toHaveLength(1);
            expect(route?.path).toBe("/live");
            expect(route?.event).toBe("$message");
            expect(route?.handler.invoke()).toBe("pong");
        });

        it("throws before init when reading routes", () => {
            @Module({})
            class AppModule {}

            const app = new ApplicationContext(AppModule);

            expect(() => app.getRoutes()).toThrow(/has not been initialized/);
            expect(() => app.getHttpRoutes()).toThrow(/has not been initialized/);
            expect(() => app.getWebSocketRoutes()).toThrow(/has not been initialized/);
        });

        it("throws on duplicate HTTP routes", async () => {
            @Controller("users")
            class FirstController {
                @Get()
                public list(): string {
                    return "first";
                }
            }

            @Controller("users")
            class SecondController {
                @Get()
                public list(): string {
                    return "second";
                }
            }

            @Module({
                controllers: [FirstController, SecondController],
            })
            class AppModule {}

            await expect(ApplicationContext.create(AppModule)).rejects.toThrow(
                /Duplicate HTTP route: GET \/users/,
            );
        });

        it("does not duplicate routes when init is called twice", async () => {
            @Controller("ping")
            class PingController {
                @Get()
                public ping(): string {
                    return "pong";
                }
            }

            @Module({
                controllers: [PingController],
            })
            class AppModule {}

            const app = new ApplicationContext(AppModule);
            await app.init();
            await app.init();

            expect(app.getHttpRoutes()).toHaveLength(1);
        });
    });
});
