export interface HttpConnection {
    readonly remoteAddress: string;
    readonly remotePort: number;
}
export interface HttpRequest {
    readonly method: string;
    readonly url: string;
    readonly headers: Readonly<Record<string, string | string[] | undefined>>;
    readonly query: Readonly<Record<string, string | string[] | undefined>>;
    readonly params: Readonly<Record<string, string | string[] | undefined>>;
    readonly body: unknown;
    readonly cookies: Readonly<Record<string, string | undefined>>;
    readonly ip: string;
    readonly userAgent: string;
    readonly requestId?: string;
    readonly traceId?: string;
    readonly connection: HttpConnection;
}
//# sourceMappingURL=request.d.ts.map