const MULTER_DEFAULT_FILE_SIZE = 5 * 1024 * 1024;
const MULTER_MESSAGES = {
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
export function isMulterError(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        typeof value.code === "string");
}
export function fromUploadError(error) {
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
        err.message = String(error.message);
    }
    return err;
}
function isUploadErrorLike(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value));
}
export function createMemoryUploadOptions(limits) {
    return {
        storage: "memory",
        limits: {
            fileSize: limits?.fileSize ?? MULTER_DEFAULT_FILE_SIZE,
            files: limits?.files ?? Number.MAX_SAFE_INTEGER,
            fieldNameSize: limits?.fieldNameSize ?? 100,
        },
    };
}
export function createUploadMiddleware(limits) {
    const options = createMemoryUploadOptions(limits);
    const factory = (typeof require === "function"
        ? require("multer")
        : undefined);
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
//# sourceMappingURL=upload.js.map