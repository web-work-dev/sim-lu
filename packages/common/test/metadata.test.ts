import { describe, expect, it } from "vitest";

import { METADATA_KEYS } from "../src/index.js";
import type {
    ControllerMetadata,
    InjectableMetadata,
    ModuleMetadata,
    ParameterMetadata,
    RouteMetadata,
    WebSocketEventMetadata,
    WebSocketMetadata,
} from "../src/index.js";

describe("METADATA_KEYS", () => {
    it("exposes frozen unique symbols for every decorator", () => {
        expect(Object.isFrozen(METADATA_KEYS)).toBe(true);
        expect(typeof METADATA_KEYS.CONTROLLER).toBe("symbol");
        expect(typeof METADATA_KEYS.INJECTABLE).toBe("symbol");
        expect(typeof METADATA_KEYS.MODULE).toBe("symbol");
        expect(typeof METADATA_KEYS.ROUTES).toBe("symbol");
        expect(typeof METADATA_KEYS.WEBSOCKET).toBe("symbol");
        expect(typeof METADATA_KEYS.WEBSOCKET_EVENTS).toBe("symbol");
        expect(typeof METADATA_KEYS.GUARD).toBe("symbol");
        expect(typeof METADATA_KEYS.EXCEPTION_FILTER).toBe("symbol");
        expect(typeof METADATA_KEYS.CATCH).toBe("symbol");
        expect(typeof METADATA_KEYS.TRANSFORM).toBe("symbol");
        expect(typeof METADATA_KEYS.PARAM).toBe("symbol");
        expect(METADATA_KEYS.CONTROLLER).not.toBe(METADATA_KEYS.INJECTABLE);
    });

    it("describes the public metadata shapes", () => {
        const controller: ControllerMetadata = { path: "users" };
        const injectable: InjectableMetadata = { scope: "transient" };
        const module: ModuleMetadata = { imports: [], providers: [] };
        const route: RouteMetadata = { method: "GET", path: "/", handler: "list" };
        const websocket: WebSocketMetadata = { path: "/live", subprotocol: "v1" };
        const event: WebSocketEventMetadata = { event: "$open", handler: "open" };
        const parameter: ParameterMetadata = {
            type: "query",
            index: 0,
            handler: "list",
        };

        expect(controller.path).toBe("users");
        expect(injectable.scope).toBe("transient");
        expect(module.imports).toEqual([]);
        expect(route.method).toBe("GET");
        expect(websocket.subprotocol).toBe("v1");
        expect(event.event).toBe("$open");
        expect(parameter.type).toBe("query");
    });
});
