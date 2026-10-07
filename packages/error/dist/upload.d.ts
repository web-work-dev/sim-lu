export interface UploadLimits {
    readonly fileSize?: number;
    readonly files?: number;
    readonly fieldNameSize?: number;
}
export interface UploadFile {
    readonly fieldname: string;
    readonly originalname: string;
    readonly encoding: string;
    readonly mimetype: string;
    readonly size: number;
    readonly buffer?: Buffer;
    readonly path?: string;
}
export interface UploadErrorLike {
    readonly code?: string;
    readonly message?: string;
    readonly field?: string;
}
export interface MulterLike {
    single: (fieldName: string) => unknown;
    array: (fieldName: string, maxCount?: number) => unknown;
    fields: (fields: Array<{
        name: string;
        maxCount?: number;
    }>) => unknown;
    none: () => unknown;
}
export declare function isMulterError(value: unknown): value is UploadErrorLike;
export declare function fromUploadError(error: unknown): Error;
export declare function createMemoryUploadOptions(limits?: UploadLimits): {
    readonly storage: "memory";
    readonly limits: Required<UploadLimits>;
};
export declare function createUploadMiddleware(limits?: UploadLimits): MulterLike;
//# sourceMappingURL=upload.d.ts.map