import type { InjectToken } from "../container/token.js";
import type { Container } from "../container/container.js";
import type { Transformer } from "./transformer.js";

export class TransformerRegistry {
    private readonly transformers = new Map<
        InjectToken,
        Transformer
    >();

    public constructor(
        private readonly container: Container,
    ) { }

    public async register<T extends Transformer>(
        token: InjectToken<T>,
    ): Promise<T> {
        const transformer = await this.container.resolve(token);

        this.transformers.set(token, transformer);

        return transformer;
    }

    public has(
        token: InjectToken,
    ): boolean {
        return this.transformers.has(token);
    }

    public get<T extends Transformer>(
        token: InjectToken<T>,
    ): T {
        const transformer = this.transformers.get(token);

        if (!transformer) {
            throw new Error(
                `Transformer not found for token: ${this.getTokenName(token)}`,
            );
        }

        return transformer as T;
    }

    public getAll(): ReadonlyMap<
        InjectToken,
        Transformer
    > {
        return this.transformers;
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
