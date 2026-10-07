import { describe, expect, it } from "vitest";

import {
    BadGatewayException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    GatewayTimeoutException,
    GoneException,
    HttpException,
    HttpStatus,
    InternalServerErrorException,
    MethodNotAllowedException,
    NotAcceptableException,
    NotFoundException,
    NotImplementedException,
    PayloadTooLargeException,
    PaymentRequiredException,
    ServiceUnavailableException,
    TooManyRequestsException,
    UnauthorizedException,
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
    getStatusLine,
    getStatusName,
    isHttpException,
    isHttpStatusCode,
} from "../src/index.js";

describe("HttpStatus", () => {
    it("exposes canonical codes", () => {
        expect(HttpStatus.OK).toBe(200);
        expect(HttpStatus.CREATED).toBe(201);
        expect(HttpStatus.BAD_REQUEST).toBe(400);
        expect(HttpStatus.UNAUTHORIZED).toBe(401);
        expect(HttpStatus.FORBIDDEN).toBe(403);
        expect(HttpStatus.NOT_FOUND).toBe(404);
        expect(HttpStatus.CONFLICT).toBe(409);
        expect(HttpStatus.UNPROCESSABLE_ENTITY).toBe(422);
        expect(HttpStatus.TOO_MANY_REQUESTS).toBe(429);
        expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    });

    it("maps codes to names and rejects unknown codes", () => {
        expect(getStatusName(404)).toBe("Not Found");
        expect(getStatusName(999)).toBe("Error");
        expect(getStatusLine(404)).toBe("404 Not Found");
        expect(getStatusLine(999)).toBe("999 Error");
        expect(isHttpStatusCode(404)).toBe(true);
        expect(isHttpStatusCode(399)).toBe(false);
    });
});

describe("HttpException", () => {
    it("serializes status, name, message, and details", () => {
        const error = new HttpException(409, "email taken", {
            details: { field: "email" },
            headers: { "retry-after": "30" },
            cause: new Error("unique"),
        });

        expect(error).toBeInstanceOf(Error);
        expect(error.statusCode).toBe(409);
        expect(error.error).toBe("Conflict");
        expect(error.message).toBe("email taken");
        expect(error.headers["retry-after"]).toBe("30");
        expect(error.cause).toBeInstanceOf(Error);
        expect(error.toJSON()).toEqual({
            statusCode: 409,
            error: "Conflict",
            message: "email taken",
            details: { field: "email" },
        });
        expect(isHttpException(error)).toBe(true);
        expect(isHttpException(new Error("nope"))).toBe(false);
    });

    it("uses typed subclasses with default messages", () => {
        const cases: Array<[Error, number, string]> = [
            [new BadRequestException(), 400, "Bad Request"],
            [new UnauthorizedException(), 401, "Unauthorized"],
            [new PaymentRequiredException(), 402, "Payment Required"],
            [new ForbiddenException(), 403, "Forbidden"],
            [new NotFoundException(), 404, "Not Found"],
            [new MethodNotAllowedException(), 405, "Method Not Allowed"],
            [new NotAcceptableException(), 406, "Not Acceptable"],
            [new ConflictException(), 409, "Conflict"],
            [new GoneException(), 410, "Gone"],
            [new PayloadTooLargeException(), 413, "Payload Too Large"],
            [new UnsupportedMediaTypeException(), 415, "Unsupported Media Type"],
            [new UnprocessableEntityException(), 422, "Unprocessable Entity"],
            [new TooManyRequestsException(), 429, "Too Many Requests"],
            [new InternalServerErrorException(), 500, "Internal Server Error"],
            [new NotImplementedException(), 501, "Not Implemented"],
            [new BadGatewayException(), 502, "Bad Gateway"],
            [new ServiceUnavailableException(), 503, "Service Unavailable"],
            [new GatewayTimeoutException(), 504, "Gateway Timeout"],
        ];

        for (const [error, status, message] of cases) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).statusCode).toBe(status);
            expect(error.message).toBe(message);
        }
    });

    it("preserves subclass identity through instanceof", () => {
        const missing = new NotFoundException("user missing");

        expect(missing).toBeInstanceOf(NotFoundException);
        expect(missing).toBeInstanceOf(HttpException);
        expect(missing.name).toBe("NotFoundException");
    });
});
