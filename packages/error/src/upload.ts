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
    fields: (fields: Array<{ name: string; maxCount?: number }>) => unknown;
    none: () => unknown;
}

const MULTER_DEFAULT_FILE_SIZE = 5 * 1024 * 1024;

const MULTER_MESSAGES: Record<string, string> = {
    LIMIT_FILE_SIZE: "File exceeds the allowed size",
    LIMIT_FILE_COUNT: "Too many files uploaded",
    LIMIT_FIELD_COUNT: "Too many fields",
    LIMIT_FIELD_NAME: "Field name too long",
    LIMIT_FIELD_KEY: "Field key too long",
    LIMIT_FIELD_VALUE: "Field value too long",
    LIMIT_FILE_FILTER: "File not allowed",
    LIMIT_UNEXPECTED_FILE: "Unexpected upload field",
    LIMIT_PART_COUNT: "Too many parts",
};

export function isMulterError(value: unknown): value is UploadErrorLike {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        typeof (value as { code?: unknown }).code === "string"
    );
}

export function fromUploadError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }

    if (typeof error === "string") {
        return new Error(error);
    }

    if (isUploadErrorLike(error)) {
        const msg = error.message;
        if (msg) {
            return new Error(msg);
        }

        if (error.code && error.code in MULTER_MESSAGES) {
            return new Error(MULTER_MESSAGES[error.code]);
        }
    }

    const err = new Error("Upload error");
    if (typeof error === "object" && error !== null && "message" in error) {
        err.message = String((error as { message?: unknown }).message);
    }
    return err;
}

function isUploadErrorLike(value: unknown): value is UploadErrorLike {
    return (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
    );
}

export function createMemoryUploadOptions(
    limits?: UploadLimits,
): {
    readonly storage: "memory";
    readonly limits: Required<UploadLimits>;
} {
    return {
        storage: "memory" as const,
        limits: {
            fileSize: limits?.fileSize ?? MULTER_DEFAULT_FILE_SIZE,
            files: limits?.files ?? Number.MAX_SAFE_INTEGER,
            fieldNameSize: limits?.fieldNameSize ?? 100,
        },
    };
}

export function createUploadMiddleware(
    limits?: UploadLimits,
): MulterLike {
    const options = createMemoryUploadOptions(limits);
    const factory = (typeof require === "function"
        ? require("multer")
        : undefined) as ((opts: unknown) => MulterLike) | undefined;

    if (!factory) {
        return {
            single: () => () => undefined,
            array: () => () => undefined,
            fields: () => () => undefined,
            none: () => () => undefined,
        };
    }

    return factory(options);
}
