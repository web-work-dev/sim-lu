import {
    type IncomingMessage,
    type ServerResponse,
} from "node:http";

import {
    createApplication,
    MutableHttpResponse,
    NodeHttpKernel,
} from "@sim-lu/core";
import {
    createPlatformErrorHandler,
    extractRequestId,
    extractTraceId,
    generateRequestId,
    generateTraceId,
    notFoundBody,
    snapshotRequest,
    type ErrorHandler,
    type ErrorHandlerOptions,
} from "@sim-lu/error";
import { DatabasePlugin } from "@sim-lu/database";
import type { HttpRequest } from "@sim-lu/http";

import { AppModule } from "./app.module.js";

interface KernelOptions {
    readonly error?: ErrorHandlerOptions;
}

class MinimalKernel extends NodeHttpKernel {
    public readonly name = "minimal-kernel";
    private readonly errorHandler: ErrorHandler;

    public constructor(
        options: KernelOptions = {},
    ) {
        super();
        this.errorHandler = createPlatformErrorHandler("minimal-kernel", {
            console: options.error?.console ?? true,
            ...options.error,
        });
    }

    public getErrorHandler(): ErrorHandler {
        return this.errorHandler;
    }

    public override handleRequest(
        request: IncomingMessage,
        response: ServerResponse,
    ): Promise<void> {
        return this.handle(request, response);
    }

    protected override async handle(
        incoming: IncomingMessage,
        outgoing: ServerResponse,
    ): Promise<void> {
        const method = (incoming.method ?? "GET").toUpperCase();
        const url = incoming.url ?? "/";
        const pathname = url.split("?")[0] ?? "/";
        const matched = this.match(method, pathname);
        const requestId = extractRequestId(
            incoming.headers as Record<string, string | string[] | undefined>,
        ) ?? generateRequestId();
        const traceId = extractTraceId(
            incoming.headers as Record<string, string | string[] | undefined>,
        ) ?? generateTraceId();

        outgoing.setHeader("x-request-id", requestId);
        outgoing.setHeader("x-trace-id", traceId);

        const requestSnapshot = snapshotRequest({
            method,
            url: pathname,
            ...(typeof incoming.headers["user-agent"] === "string"
                ? { userAgent: incoming.headers["user-agent"] }
                : {}),
            requestId,
            traceId,
        });

        if (!matched) {
            const serialized = notFoundBody(this.errorHandler, requestSnapshot);
            outgoing.statusCode = serialized.statusCode;
            for (const [name, value] of Object.entries(serialized.headers)) {
                outgoing.setHeader(name, value);
            }
            outgoing.end(serialized.payload);
            return;
        }

        const request = await this.toRequestWithCorrelation(
            incoming,
            url,
            pathname,
            matched.params,
            requestId,
            traceId,
        );
        const writer = new MutableHttpResponse();

        try {
            await matched.handler(request, writer);
            this.write(outgoing, writer);
        } catch {
            outgoing.statusCode = 500;
            outgoing.end("Internal Server Error");
        }
    }

    private async toRequestWithCorrelation(
        incoming: IncomingMessage,
        url: string,
        pathname: string,
        params: Record<string, string | string[] | undefined>,
        requestId: string,
        traceId: string,
    ): Promise<HttpRequest> {
        const base = await this.toRequest(incoming, url, pathname, params);
        return {
            ...base,
            requestId,
            traceId,
        };
    }
}

async function main(): Promise<void> {
    const adapter = new MinimalKernel({
        error: {
            console: true,
            file: "./logs/http-kernel.log",
            service: "http-kernel",
        },
    });

    const app = await createApplication(AppModule, adapter, {
        plugins: [DatabasePlugin.forRoot({})],
    });
    await app.listen({ port: 3000, host: "127.0.0.1" });
    console.log("Minimal kernel server listening on http://127.0.0.1:3000");
    console.log("Endpoints:");
    console.log("  GET  /api/status      - API status");
    console.log("  GET  /api/echo/:msg   - Echo with query repeat param");
    console.log("  POST /api/calculate   - Calculate two numbers");
    console.log("  GET  /api/books       - List books");
    console.log("  POST /api/books       - Create a book");
    console.log("  GET  /api/error        - Trigger error");

    process.on("SIGINT", async () => {
        await app.close();
        process.exit(0);
    });
}

void main();
