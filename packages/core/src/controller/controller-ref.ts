import type { InjectToken } from "../container/token.js";

export class ControllerRef<TController extends object> {
    public constructor(
        public readonly token: InjectToken<TController>,
        public readonly instance: TController,
    ) { }
}
