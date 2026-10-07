import { type ParameterMetadata } from "@sim-lu/common";
import type { HandlerRef } from "../execution/handler-ref.js";
export declare class ParameterMetadataResolver<TController extends object = object> {
    getParameters(handler: HandlerRef<TController>): readonly ParameterMetadata[];
    getPipes(handler: HandlerRef<TController>): readonly {
        index: number;
        pipe: Function;
    }[];
}
//# sourceMappingURL=parameter-metadata.d.ts.map