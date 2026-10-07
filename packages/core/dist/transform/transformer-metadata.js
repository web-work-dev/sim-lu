import { METADATA_KEYS, } from "@sim-lu/common";
export class TransformerMetadata {
    globalTransformers;
    constructor(globalTransformers = []) {
        this.globalTransformers = globalTransformers;
    }
    getControllerTransformers(controller) {
        return (Reflect.getMetadata(METADATA_KEYS.TRANSFORM, controller.constructor) ?? []);
    }
    getHandlerTransformers(handler) {
        return (Reflect.getMetadata(METADATA_KEYS.TRANSFORM, handler.controller.instance, handler.method) ?? []);
    }
    getTransformers(handler) {
        const controllerTransformers = this.getControllerTransformers(handler.controller.instance);
        const handlerTransformers = this.getHandlerTransformers(handler);
        return [
            ...this.globalTransformers,
            ...controllerTransformers,
            ...handlerTransformers,
        ];
    }
}
//# sourceMappingURL=transformer-metadata.js.map