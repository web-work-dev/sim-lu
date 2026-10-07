import { Injectable, type ExecutionContext, type Transformer } from "@sim-lu/core";

@Injectable({ scope: "singleton" })
export class EnvelopeTransformer implements Transformer {
    public transform(value: unknown, _context: ExecutionContext): unknown {
        if (value === undefined || value === null) {
            return { success: true, data: null };
        }

        if (typeof value === "object" && "success" in value) {
            return value;
        }

        return { success: true, data: value };
    }
}
