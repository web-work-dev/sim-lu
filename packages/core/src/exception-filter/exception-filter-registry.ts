import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";
import type { ExceptionFilter } from "./exception-filter.js";

export class ExceptionFilterRegistry {
    private readonly filters = new Map<
        InjectToken,
        ExceptionFilter
    >();

    public constructor(
        private readonly container: Container,
    ) { }

    public async register<T extends ExceptionFilter>(
        token: InjectToken<T>,
    ): Promise<T> {
        const filter = await this.container.resolve(token);

        this.filters.set(token, filter);

        return filter;
    }

    public has(
        token: InjectToken,
    ): boolean {
        return this.filters.has(token);
    }

    public get<T extends ExceptionFilter>(
        token: InjectToken<T>,
    ): T {
        const filter = this.filters.get(token);

        if (!filter) {
            throw new Error(
                `Exception filter not found for token: ${this.getTokenName(token)}`,
            );
        }

        return filter as T;
    }

    public getAll(): ReadonlyMap<
        InjectToken,
        ExceptionFilter
    > {
        return this.filters;
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
