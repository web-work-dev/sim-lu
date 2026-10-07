import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";

export class ModuleRef {
    public constructor(
        private readonly container: Container,
    ) { }

    public async resolve<T>(
        token: InjectToken<T>,
    ): Promise<T> {
        return this.container.resolve(token);
    }

    public async get<T>(
        token: InjectToken<T>,
    ): Promise<T> {
        return this.resolve(token);
    }

    public has(
        token: InjectToken,
    ): boolean {
        return this.container.has(token);
    }
}