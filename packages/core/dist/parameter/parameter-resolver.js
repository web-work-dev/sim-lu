import { ParameterMetadataResolver } from "./parameter-metadata.js";
export class ParameterResolver {
    metadata;
    constructor(metadata) {
        this.metadata = metadata;
    }
    resolve(handler, context) {
        const parameters = this.metadata.getParameters(handler);
        if (parameters.length === 0) {
            return [];
        }
        const args = [];
        for (const parameter of parameters) {
            args[parameter.index] =
                this.resolveParameter(parameter, context);
        }
        return args;
    }
    getParameterPipes(handler) {
        return this.metadata.getPipes(handler);
    }
    resolveParameter(parameter, context) {
        switch (parameter.type) {
            case "context":
                return context;
            case "request":
                return context.get("request");
            case "response":
                return context.get("response");
            case "param":
                return this.resolveNamedValue(context, "params", parameter);
            case "query":
                return this.resolveNamedValue(context, "query", parameter);
            case "header":
                return this.resolveNamedValue(context, "headers", parameter);
            case "cookie":
                return this.resolveNamedValue(context, "cookies", parameter);
            case "body":
                return context.get("body");
            case "session":
                return context.get("session");
            case "ws-socket":
                return context.get("ws.socket");
            case "ws-message":
                return context.get("ws.message");
            case "ws-context":
                return context.get("ws.context");
            default:
                return undefined;
        }
    }
    resolveNamedValue(context, stateKey, parameter) {
        const source = context.get(stateKey);
        const value = parameter.name !== undefined
            ? source?.[parameter.name]
            : undefined;
        if (value === undefined &&
            parameter.default !== undefined) {
            return parameter.default;
        }
        if (value === undefined &&
            parameter.required) {
            throw new Error(`Required parameter "${parameter.name ?? parameter.index}" is missing`);
        }
        return value;
    }
}
//# sourceMappingURL=parameter-resolver.js.map