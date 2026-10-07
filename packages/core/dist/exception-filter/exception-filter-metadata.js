import { METADATA_KEYS, } from "@sim-lu/common";
export class ExceptionFilterMetadata {
    globalFilters;
    constructor(globalFilters = []) {
        this.globalFilters = globalFilters;
    }
    getGlobalFilters() {
        return this.globalFilters;
    }
    getControllerFilters(controller) {
        return (Reflect.getMetadata(METADATA_KEYS.EXCEPTION_FILTER, controller.constructor) ?? []);
    }
    getHandlerFilters(handler) {
        return (Reflect.getMetadata(METADATA_KEYS.EXCEPTION_FILTER, handler.controller.instance, handler.method) ?? []);
    }
    getCatchTypes(token) {
        return (Reflect.getMetadata(METADATA_KEYS.CATCH, token) ?? []);
    }
    getFilters(handler) {
        const controllerFilters = this.getControllerFilters(handler.controller.instance);
        const handlerFilters = this.getHandlerFilters(handler);
        return [
            ...this.globalFilters,
            ...controllerFilters,
            ...handlerFilters,
        ];
    }
}
//# sourceMappingURL=exception-filter-metadata.js.map