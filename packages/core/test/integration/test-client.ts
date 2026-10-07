import type { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

import type { HttpAdapter } from "@sim-lu/core";

export interface TestResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
    json: unknown;
}

export function createHttpPair(
    method: string,
    url: string,
    headers: Record<string, string> = {},
    body?: string,
): { request: IncomingMessage; response: ServerResponse; collect: () => Promise<TestResponse> } {
    const socket = new Socket();
    const request = new IncomingMessage(socket);
    request.method = method;
    request.url = url;
    request.headers = headers;

    if (body !== undefined) {
        queueMicrotask(() => {
            request.push(Buffer.from(body));
            request.push(null);
        });
    } else {
        queueMicrotask(() => {
            request.push(null);
        });
    }

    const response = new ServerResponse(request);
    const chunks: Buffer[] = [];

    response.write = ((chunk: unknown, encoding?: unknown, callback?: unknown) => {
        if (chunk) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
            chunks.push(buffer);
        }

        if (typeof encoding === "function") {
            encoding();
        } else if (typeof callback === "function") {
            callback();
        }

        return true;
    }) as ServerResponse["write"];

    response.end = ((chunk?: unknown, encoding?: unknown, callback?: unknown) => {
        if (chunk && typeof chunk !== "function") {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
            chunks.push(buffer);
        }

        response.emit("finish");

        const finish = typeof chunk === "function"
            ? chunk
            : typeof encoding === "function"
                ? encoding
                : callback;

        if (typeof finish === "function") {
            finish();
        }

        return response;
    }) as ServerResponse["end"];

    Object.defineProperty(response, "statusCode", {
        writable: true,
        value: 200,
    });

    const headersMap = new Map<string, string>();
    const originalSetHeader = response.setHeader.bind(response);
    response.setHeader = ((name: string, value: string | string[]) => {
        const stringValue = Array.isArray(value) ? value.join(", ") : value;
        headersMap.set(name.toLowerCase(), stringValue);
        return originalSetHeader(name, value);
    }) as ServerResponse["setHeader"];

    const collect = async (): Promise<TestResponse> => {
        return new Promise<TestResponse>((resolve) => {
            response.on("finish", () => {
                const body = Buffer.concat(chunks).toString("utf8");
                let json: unknown = undefined;
                try {
                    json = JSON.parse(body);
                } catch {
                    json = undefined;
                }
                resolve({
                    status: response.statusCode,
                    headers: Object.fromEntries(headersMap),
                    body,
                    json,
                });
            });
        });
    };

    return { request, response, collect };
}

export async function sendRequest(
    adapter: HttpAdapter,
    method: string,
    url: string,
    headers: Record<string, string> = {},
    body?: string,
): Promise<TestResponse> {
    const { request, response, collect } = createHttpPair(method, url, headers, body);

    if (adapter.handleRequest) {
        await adapter.handleRequest(request, response);
    } else {
        throw new Error("Adapter does not implement handleRequest");
    }

    return collect();
}

export async function fetchLocal(
    port: number,
    path: string,
    options: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
    } = {},
): Promise<TestResponse> {
    const method = (options.method ?? "GET").toUpperCase();
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: options.headers,
        body: options.body,
    });

    const bodyText = await res.text();
    let json: unknown = undefined;
    try {
        json = JSON.parse(bodyText);
    } catch {
        json = undefined;
    }

    return {
        status: res.status,
        headers: Object.fromEntries(res.headers.entries()),
        body: bodyText,
        json,
    };
}
