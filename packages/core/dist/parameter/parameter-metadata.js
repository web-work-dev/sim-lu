import { METADATA_KEYS, } from "@sim-lu/common";
export class ParameterMetadataResolver {
    getParameters(handler) {
        const allParameters = Reflect.getMetadata(METADATA_KEYS.PARAM, handler.controller.instance.constructor) ?? [];
        return allParameters.filter((parameter) => parameter.handler === handler.method);
    }
    getPipes(handler) {
        return (Reflect.getMetadata(METADATA_KEYS.PARAMETER_PIPES, handler.controller.instance, handler.method) ?? []);
    }
}
//# sourceMappingURL=parameter-metadata.js.map