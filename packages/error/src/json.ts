export function serializeJson(
    value: unknown,
    fallback = "{\"success\":false,\"statusCode\":500,\"error\":\"Internal Server Error\",\"message\":\"Failed to serialize error response\"}",
): string {
    try {
        return JSON.stringify(value, createSafeReplacer()) ?? fallback;
    } catch {
        return fallback;
    }
}

export function createSafeReplacer(): (key: string, value: unknown) => unknown {
    const seen = new WeakSet<object>();

    return (_key, value) => {
        if (typeof value === "bigint") {
            return value.toString();
        }

        if (typeof value === "function") {
            return undefined;
        }

        if (value instanceof Error) {
            return {
                name: value.name,
                message: value.message,
                stack: value.stack,
            };
        }

        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return "[Circular]";
            }

            seen.add(value);
        }

        return value;
    };
}
