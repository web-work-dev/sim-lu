import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";
import type { Guard } from "./guard.js";

export class GuardRegistry {
    private readonly guards = new Map<
        InjectToken,
        Guard
    >();

    public constructor(
        private readonly container: Container,
    ) { }

    public async register<T extends Guard>(
        token: InjectToken<T>,
    ): Promise<T> {
        const guard = await this.container.resolve(token);

        this.guards.set(token, guard);

        return guard;
    }

    public has(
        token: InjectToken,
    ): boolean {
        return this.guards.has(token);
    }

    public get<T extends Guard>(
        token: InjectToken<T>,
    ): T {
        const guard = this.guards.get(token);

        if (!guard) {
            throw new Error(
                `Guard not found for token: ${this.getTokenName(token)}`,
            );
        }

        return guard as T;
    }

    public getAll(): ReadonlyMap<
        InjectToken,
        Guard
    > {
        return this.guards;
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