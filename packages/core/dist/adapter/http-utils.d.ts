export declare function parseQuery(search: string): Record<string, string | string[] | undefined>;
export declare function parseCookies(header: string | undefined): Record<string, string | undefined>;
export declare function extractParamNames(path: string): readonly string[];
export declare function serializeBody(body: unknown): {
    readonly payload: string;
    readonly contentType: string | undefined;
};
//# sourceMappingURL=http-utils.d.ts.map