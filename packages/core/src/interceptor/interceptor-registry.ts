import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";
import type { Interceptor } from "./interceptor.js";

export class InterceptorRegistry {
    private readonly interceptors = new Map<
        InjectToken,
        Interceptor
    >();

    public constructor(
        private readonly container: Container,
    ) { }

    public async register<T extends Interceptor>(
        token: InjectToken<T>,
    ): Promise<T> {
        const interceptor = await this.container.resolve(token);

        this.interceptors.set(token, interceptor);

        return interceptor;
    }

    public has(
        token: InjectToken,
    ): boolean {
        return this.interceptors.has(token);
    }

    public get<T extends Interceptor>(
        token: InjectToken<T>,
    ): T {
        const interceptor = this.interceptors.get(token);

        if (!interceptor) {
            throw new Error(
                `Interceptor not found for token: ${this.getTokenName(token)}`,
            );
        }

        return interceptor as T;
    }

    public getAll(): ReadonlyMap<
        InjectToken,
        Interceptor
    > {
        return this.interceptors;
    }

    private getTokenName(
        token: InjectToken,
    ): string {
        if (typeof token === "function") {
            return token.name || "<anonymous>";
        }

        if (typeof token === "symbol") {
            return token.toString();
        }

        return token;
    }
}