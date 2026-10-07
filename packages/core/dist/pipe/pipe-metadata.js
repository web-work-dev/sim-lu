import { METADATA_KEYS, } from "@sim-lu/common";
export class PipeMetadata {
    getControllerPipes(controller) {
        return (Reflect.getMetadata(METADATA_KEYS.PIPE, controller.constructor) ?? []);
    }
    getHandlerPipes(handler) {
        return (Reflect.getMetadata(METADATA_KEYS.PIPE, handler.controller.instance, handler.method) ?? []);
    }
    getPipes(handler) {
        const controllerPipes = this.getControllerPipes(handler.controller.instance);
        const handlerPipes = this.getHandlerPipes(handler);
        return [
            ...controllerPipes,
            ...handlerPipes,
        ];
    }
}
//# sourceMappingURL=pipe-metadata.js.map