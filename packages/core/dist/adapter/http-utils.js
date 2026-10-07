export function parseQuery(search) {
    const query = {};
    const source = search.startsWith("?") ? search.slice(1) : search;
    if (!source) {
        return query;
    }
    for (const pair of source.split("&")) {
        if (pair.length === 0) {
            continue;
        }
        const separator = pair.indexOf("=");
        const rawKey = separator === -1 ? pair : pair.slice(0, separator);
        const rawValue = separator === -1 ? "" : pair.slice(separator + 1);
        const key = decodeURIComponent(rawKey.replace(/\+/g, " "));
        const value = decodeURIComponent(rawValue.replace(/\+/g, " "));
        const current = query[key];
        if (current === undefined) {
            query[key] = value;
        }
        else if (Array.isArray(current)) {
            current.push(value);
        }
        else {
            query[key] = [current, value];
        }
    }
    return query;
}
export function parseCookies(header) {
    const cookies = {};
    if (!header) {
        return cookies;
    }
    for (const part of header.split(";")) {
        const separator = part.indexOf("=");
        if (separator === -1) {
            continue;
        }
        const key = part.slice(0, separator).trim();
        const value = part.slice(separator + 1).trim();
        if (key.length > 0) {
            cookies[key] = value;
        }
    }
    return cookies;
}
export function extractParamNames(path) {
    return path
        .split("/")
        .filter((segment) => segment.startsWith(":") || segment === "*")
        .map((segment) => (segment.startsWith(":") ? segment.slice(1) : "*"));
}
export function serializeBody(body) {
    if (body === undefined || body === null) {
        return {
            payload: "",
            contentType: undefined,
        };
    }
    if (typeof body === "string") {
        return {
            payload: body,
            contentType: "text/plain; charset=utf-8",
        };
    }
    return {
        payload: JSON.stringify(body),
        contentType: "application/json; charset=utf-8",
    };
}
//# sourceMappingURL=http-utils.js.map