export interface HttpResponse {
    readonly status: number;
    readonly headers: Readonly<Record<string, string | string[] | undefined>>;
    readonly body: unknown;
    readonly cookies: Readonly<Record<string, string | undefined>>;
    readonly setCookie: (name: string, value: string, options?: CookieOptions) => void;
    readonly clearCookie: (name: string, options?: CookieOptions) => void;
}
export interface CookieOptions {
    readonly maxAge?: number;
    readonly httpOnly?: boolean;
    readonly secure?: boolean;
    readonly path?: string;
    readonly sameSite?: "lax" | "strict" | "none";
}
//# sourceMappingURL=response.d.ts.map