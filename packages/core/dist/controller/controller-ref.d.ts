import type { InjectToken } from "../container/token.js";
export declare class ControllerRef<TController extends object> {
    readonly token: InjectToken<TController>;
    readonly instance: TController;
    constructor(token: InjectToken<TController>, instance: TController);
}
//# sourceMappingURL=controller-ref.d.ts.map