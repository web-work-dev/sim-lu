export type PathParams = Record<string, string | string[] | undefined>;
export declare function splitPath(path: string): string[];
export declare function joinPaths(...parts: string[]): string;
export declare function matchPath(template: string, requestPath: string): PathParams | undefined;
export declare function pathSpecificity(template: string): number;
//# sourceMappingURL=path.d.ts.map