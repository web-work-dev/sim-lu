import { Injectable, type ExecutionContext, type Interceptor } from "@sim-lu/core";
import type { HttpRequest } from "@sim-lu/http";

@Injectable({ scope: "singleton" })
export class LoggingInterceptor implements Interceptor {
    public async intercept(
        context: ExecutionContext,
        next: () => unknown | Promise<unknown>,
    ): Promise<unknown> {
        const request = context.get<HttpRequest>("request");
        const method = request?.method ?? "UNKNOWN";
        const url = request?.url ?? "/";

        const start = Date.now();
        console.log(`[LoggingInterceptor] -> ${method} ${url}`);

        try {
            const result = await next();
            const elapsed = Date.now() - start;
            console.log(`[LoggingInterceptor] <- ${method} ${url} (${elapsed}ms)`);
            return result;
        } catch (error) {
            const elapsed = Date.now() - start;
            console.log(`[LoggingInterceptor] X ${method} ${url} (${elapsed}ms) - ${String(error)}`);
            throw error;
        }
    }
}
