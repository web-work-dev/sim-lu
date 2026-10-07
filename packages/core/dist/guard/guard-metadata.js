import { METADATA_KEYS, } from "@sim-lu/common";
export class GuardMetadata {
    globalGuards;
    constructor(globalGuards = []) {
        this.globalGuards = globalGuards;
    }
    getControllerGuards(controller) {
        return (Reflect.getMetadata(METADATA_KEYS.GUARD, controller.constructor) ?? []);
    }
    getHandlerGuards(handler) {
        return (Reflect.getMetadata(METADATA_KEYS.GUARD, handler.controller.instance, handler.method) ?? []);
    }
    getGuards(handler) {
        const controllerGuards = this.getControllerGuards(handler.controller.instance);
        const handlerGuards = this.getHandlerGuards(handler);
        return [
            ...this.globalGuards,
            ...controllerGuards,
            ...handlerGuards,
        ];
    }
}
//# sourceMappingURL=guard-metadata.js.map