import type {
    ParameterMetadata,
} from "@sim-lu/common";

import type { HandlerRef } from "../execution/handler-ref.js";
import type { ExecutionContext } from "../execution/execution-context.js";
import type { ParameterPipeMetadata } from "./parameter-pipe-executor.js";
import { ParameterMetadataResolver } from "./parameter-metadata.js";

export class ParameterResolver<TController extends object = object> {
    public constructor(
        private readonly metadata: ParameterMetadataResolver<TController>,
    ) { }

    public resolve(
        handler: HandlerRef<TController>,
        context: ExecutionContext,
    ): unknown[] {
        const parameters =
            this.metadata.getParameters(handler);

        if (parameters.length === 0) {
            return [];
        }

        const args: unknown[] = [];

        for (const parameter of parameters) {
            args[parameter.index] =
                this.resolveParameter(
                    parameter,
                    context,
                );
        }

        return args;
    }

    public getParameterPipes(
        handler: HandlerRef<TController>,
    ): readonly ParameterPipeMetadata[] {
        return this.metadata.getPipes(handler) as readonly ParameterPipeMetadata[];
    }

    private resolveParameter(
        parameter: ParameterMetadata,
        context: ExecutionContext,
    ): unknown {
        switch (parameter.type) {
            case "context":
                return context;

            case "request":
                return context.get("request");

            case "response":
                return context.get("response");

            case "param":
                return this.resolveNamedValue(
                    context,
                    "params",
                    parameter,
                );

            case "query":
                return this.resolveNamedValue(
                    context,
                    "query",
                    parameter,
                );

            case "header":
                return this.resolveNamedValue(
                    context,
                    "headers",
                    parameter,
                );

            case "cookie":
                return this.resolveNamedValue(
                    context,
                    "cookies",
                    parameter,
                );

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

    private resolveNamedValue(
        context: ExecutionContext,
        stateKey: string,
        parameter: ParameterMetadata,
    ): unknown {
        const source =
            context.get<
                Record<
                    string,
                    unknown
                >
            >(stateKey);

        const value =
            parameter.name !== undefined
                ? source?.[parameter.name]
                : undefined;

        if (
            value === undefined &&
            parameter.default !== undefined
        ) {
            return parameter.default;
        }

        if (
            value === undefined &&
            parameter.required
        ) {
            throw new Error(
                `Required parameter "${parameter.name ?? parameter.index}" is missing`,
            );
        }

        return value;
    }
}