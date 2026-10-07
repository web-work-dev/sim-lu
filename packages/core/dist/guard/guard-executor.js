import { ForbiddenException } from "@sim-lu/error";
import { GuardContext } from "./guard-context.js";
import { GuardMetadata } from "./guard-metadata.js";
import { GuardRegistry } from "./guard-registry.js";
export class GuardExecutor {
    metadata;
    registry;
    constructor(metadata, registry) {
        this.metadata = metadata;
        this.registry = registry;
    }
    async execute(handler, context) {
        const guardTokens = this.metadata.getGuards(handler);
        for (const token of guardTokens) {
            const guard = await this.resolveGuard(token);
            const allowed = await guard.canActivate(context);
            if (!allowed) {
                throw new ForbiddenException("Execution denied by guard");
            }
        }
        return true;
    }
    async resolveGuard(token) {
        if (!this.registry.has(token)) {
            await this.registry.register(token);
        }
        return this.registry.get(token);
    }
}
//# sourceMappingURL=guard-executor.js.map