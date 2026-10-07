export type PathParams = Record<string, string | string[] | undefined>;

export function splitPath(
    path: string,
): string[] {
    return path.split("/").filter((segment) => segment.length > 0);
}

export function joinPaths(
    ...parts: string[]
): string {
    const segments: string[] = [];

    for (const part of parts) {
        for (const segment of part.split("/")) {
            if (segment.length === 0) {
                continue;
            }

            segments.push(segment);
        }
    }

    if (segments.length === 0) {
        return "/";
    }

    return `/${segments.join("/")}`;
}

export function matchPath(
    template: string,
    requestPath: string,
): PathParams | undefined {
    const templateSegments = splitPath(template);
    const requestSegments = splitPath(requestPath);
    const lastTemplate = templateSegments[templateSegments.length - 1];
    const wildcard = lastTemplate === "*";

    if (!wildcard && templateSegments.length !== requestSegments.length) {
        return undefined;
    }

    if (wildcard && requestSegments.length < templateSegments.length - 1) {
        return undefined;
    }

    const params: PathParams = {};
    const limit = wildcard
        ? templateSegments.length - 1
        : templateSegments.length;

    for (let index = 0; index < limit; index += 1) {
        const expected = templateSegments[index] ?? "";
        const actual = requestSegments[index] ?? "";

        if (expected.startsWith(":")) {
            params[expected.slice(1)] = decodeSegment(actual);
            continue;
        }

        if (expected !== actual) {
            return undefined;
        }
    }

    if (wildcard) {
        params["*"] = requestSegments.slice(templateSegments.length - 1)
            .map(decodeSegment)
            .join("/");
    }

    return params;
}

export function pathSpecificity(
    template: string,
): number {
    let score = 0;

    for (const segment of splitPath(template)) {
        if (segment === "*") {
            score += 1;
        } else if (segment.startsWith(":")) {
            score += 10;
        } else {
            score += 100;
        }
    }

    return score;
}

function decodeSegment(
    value: string,
): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
