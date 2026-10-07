import type { InjectToken, Container } from "../index.js";
import { ControllerRef } from "./controller-ref.js";

export class ControllerRegistry {
    private readonly controllers = new Map<
        InjectToken,
        ControllerRef<object>
    >();

    public constructor(
        private readonly container: Container,
    ) { }

    public async register<T extends object>(
        token: InjectToken<T>,
    ): Promise<ControllerRef<T>> {
        const instance = await this.container.resolve(token);

        const controller = new ControllerRef(
            token,
            instance,
        );

        this.controllers.set(token, controller as ControllerRef<object>);

        return controller;
    }

    public has(
        token: InjectToken,
    ): boolean {
        return this.controllers.has(token);
    }

    public get<T extends object>(
        token: InjectToken<T>,
    ): ControllerRef<T> {
        const controller = this.controllers.get(token);

        if (!controller) {
            throw new Error(
                `Controller not found for token: ${this.getTokenName(token)}`,
            );
        }

        return controller as ControllerRef<T>;
    }

    public getAll(): ReadonlyMap<
        InjectToken,
        ControllerRef<object>
    > {
        return this.controllers;
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