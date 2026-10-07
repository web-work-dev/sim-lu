import type { CookieOptions, HttpResponse } from "@sim-lu/http";

export class MutableHttpResponse implements HttpResponse {
    private currentStatus = 200;
    private currentBody: unknown = undefined;
    private readonly headerStore: Record<string, string | string[] | undefined> = {};
    private readonly cookieStore: Record<string, string | undefined> = {};

    public get status(): number {
        return this.currentStatus;
    }

    public get body(): unknown {
        return this.currentBody;
    }

    public get headers(): Readonly<Record<string, string | string[] | undefined>> {
        return this.headerStore;
    }

    public get cookies(): Readonly<Record<string, string | undefined>> {
        return this.cookieStore;
    }

    public setStatus(
        status: number,
    ): this {
        this.currentStatus = status;
        return this;
    }

    public setHeader(
        name: string,
        value: string | string[],
    ): this {
        this.headerStore[name.toLowerCase()] = value;
        return this;
    }

    public send(
        body: unknown,
    ): this {
        this.currentBody = body;
        return this;
    }

    public readonly setCookie = (
        name: string,
        value: string,
        _options?: CookieOptions,
    ): void => {
        this.cookieStore[name] = value;
    };

    public readonly clearCookie = (
        name: string,
        _options?: CookieOptions,
    ): void => {
        delete this.cookieStore[name];
    };
}
