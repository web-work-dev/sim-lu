import { GuardContext, Injectable, type Guard } from "@sim-lu/core";
import { UnauthorizedException } from "@sim-lu/error";
import type { HttpRequest } from "@sim-lu/http";

@Injectable({ scope: "singleton" })
export class ApiKeyGuard implements Guard {
    public canActivate(context: GuardContext): boolean {
        const request = context.get<HttpRequest>("request");

        if (!request) {
            throw new UnauthorizedException("Request context not available");
        }

        const headers = request.headers;
        const apiKey = headers["x-api-key"] ?? headers["authorization"];

        if (apiKey !== "secret-key") {
            throw new UnauthorizedException(
                "Invalid or missing API key. Use header: x-api-key: secret-key",
            );
        }

        return true;
    }
}
