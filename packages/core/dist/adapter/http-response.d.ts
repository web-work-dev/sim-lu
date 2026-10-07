import type { CookieOptions, HttpResponse } from "@sim-lu/http";
export declare class MutableHttpResponse implements HttpResponse {
    private currentStatus;
    private currentBody;
    private readonly headerStore;
    private readonly cookieStore;
    get status(): number;
    get body(): unknown;
    get headers(): Readonly<Record<string, string | string[] | undefined>>;
    get cookies(): Readonly<Record<string, string | undefined>>;
    setStatus(status: number): this;
    setHeader(name: string, value: string | string[]): this;
    send(body: unknown): this;
    readonly setCookie: (name: string, value: string, _options?: CookieOptions) => void;
    readonly clearCookie: (name: string, _options?: CookieOptions) => void;
}
//# sourceMappingURL=http-response.d.ts.map