import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";
import type { Pipe } from "./pipe.js";

export class PipeRegistry {
    private readonly pipes = new Map<
        InjectToken,
        Pipe
    >();

    public constructor(
        private readonly container: Container,
    ) { }

    public async register<T extends Pipe>(
        token: InjectToken<T>,
    ): Promise<T> {
        const pipe = await this.container.resolve(token);

        this.pipes.set(token, pipe);

        return pipe;
    }

    public has(
        token: InjectToken,
    ): boolean {
        return this.pipes.has(token);
    }

    public get<T extends Pipe>(
        token: InjectToken<T>,
    ): T {
        const pipe = this.pipes.get(token);

        if (!pipe) {
            throw new Error(
                `Pipe not found for token: ${this.getTokenName(token)}`,
            );
        }

        return pipe as T;
    }

    public getAll(): ReadonlyMap<
        InjectToken,
        Pipe
    > {
        return this.pipes;
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