import type { InjectToken } from "../container/token.js";
import { ForbiddenException } from "@sim-lu/error";
import type { HandlerRef } from "../execution/handler-ref.js";
import { GuardContext } from "./guard-context.js";
import { GuardMetadata } from "./guard-metadata.js";
import { GuardRegistry } from "./guard-registry.js";
import type { Guard } from "./guard.js";

export class GuardExecutor {
    public constructor(
        private readonly metadata: GuardMetadata,
        private readonly registry: GuardRegistry,
    ) { }

    public async execute<TController extends object>(
        handler: HandlerRef<TController>,
        context: GuardContext<TController>,
    ): Promise<boolean> {
        const guardTokens =
            this.metadata.getGuards(handler);

        for (const token of guardTokens) {
            const guard =
                await this.resolveGuard<Guard<TController>>(token as any);

            const allowed =
                await guard.canActivate(context);

            if (!allowed) {
                throw new ForbiddenException(
                    "Execution denied by guard",
                );
            }
        }

        return true;
    }

    private async resolveGuard<T extends Guard>(
        token: InjectToken<T>,
    ): Promise<T> {
        if (!this.registry.has(token)) {
            await this.registry.register(token);
        }

        return this.registry.get(token);
    }
}