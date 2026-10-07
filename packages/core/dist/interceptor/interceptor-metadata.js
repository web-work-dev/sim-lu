import { METADATA_KEYS, } from "@sim-lu/common";
export class InterceptorMetadata {
    globalInterceptors;
    constructor(globalInterceptors = []) {
        this.globalInterceptors = globalInterceptors;
    }
    getControllerInterceptors(controller) {
        return (Reflect.getMetadata(METADATA_KEYS.INTERCEPTOR, controller.constructor) ?? []);
    }
    getHandlerInterceptors(handler) {
        return (Reflect.getMetadata(METADATA_KEYS.INTERCEPTOR, handler.controller.instance, handler.method) ?? []);
    }
    getInterceptors(handler) {
        const controllerInterceptors = this.getControllerInterceptors(handler.controller.instance);
        const handlerInterceptors = this.getHandlerInterceptors(handler);
        return [
            ...this.globalInterceptors,
            ...controllerInterceptors,
            ...handlerInterceptors,
        ];
    }
}
//# sourceMappingURL=interceptor-metadata.js.map