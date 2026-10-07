import type { GuardContext } from "./guard-context.js";
export interface Guard<TController extends object = object> {
    canActivate(context: GuardContext<TController>): boolean | Promise<boolean>;
}
//# sourceMappingURL=guard.d.ts.map