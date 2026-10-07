# Error Handling Guide

This guide covers the error handling system in the `@sim-lu` framework, including exceptions, filters, normalization, and response serialization.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [HTTP Exception Hierarchy](#http-exception-hierarchy)
3. [Response Helpers](#response-helpers)
4. [Error Normalization](#error-normalization)
5. [Exception Filters](#exception-filters)
6. [Default Exception Filter](#default-exception-filter)
7. [Platform Error Handling](#platform-error-handling)
8. [Error Logging](#error-logging)
9. [Request Correlation](#request-correlation)
10. [Testing Error Handling](#testing-error-handling)

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Exception Thrown                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          ExecutionEngine.execute() catch block              │
│                                                              │
│  try: interceptor → guard → handler                          │
│  catch: ExceptionFilterExecutor.execute()                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          ExceptionFilterExecutor.execute()                  │
│                                                              │
│  for each matching @Catch filter (reverse order):            │
│    filter.catch(exception, context) → return result        │
│                                                              │
│  if no match:                                                │
│    fallback?.catch(exception, context)                      │
│    (DefaultExceptionFilter)                                  │
│                                                              │
│  if no match and no fallback:                                │
│    re-throw exception                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
┌─────────────────────┐ ┌─────────────────────┐
│ Custom @Catch filter│ │ DefaultExceptionFilter│
└─────────────────────┘ │   1. ErrorHandler.   │
                         │      handle()        │
                         │      → SerializedBody│
                         │   2. Return           │
                         │      SerializedBody  │
                         └─────────────────────┘
                        │
               ┌────────┴────────┐
               │                 │
               ▼                 ▼
     Custom filter result   ┌─────────────────────┐
                            │ ExecutionEngine:    │
                            │ isSerializedBody?   │
                            │ YES → skip pipes &  │
                            │       transformers  │
                            │ NO → normal flow    │
                            └─────────────────────┘
                                   │
                                   ▼
                     ┌──────────────────────────────┐
                     │ RequestExecutor.executeHttp()│
                     │   1. isSerializedBody?       │
                     │      YES → apply to response │
                     │      (setStatus, headers,    │
                     │       send payload)          │
                     │   2. Else if body undefined  │
                     │      → send result           │
                     └──────────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────────┐
                    │ Platform Adapter               │
                    │   Express: writeExpress()      │
                    │   uWS: writeUws() /           │
                    │         writeSerializedUws()  │
                    └──────────────────────────────┘
```

---

## HTTP Exception Hierarchy

All HTTP exceptions extend `HttpException` from `@sim-lu/error`:

```typescript
// Base class
class HttpException {
    readonly statusCode: number;
    readonly message: string;
    readonly error: string;
    readonly details?: unknown;
    readonly headers: Record<string, string | string[]>;
    readonly cause?: unknown;
    readonly stack?: string;
}
```

### Available Exception Classes

| Class                         | Status Code | Description               |
| ----------------------------- | ----------- | ------------------------- |
| `BadRequestException`         | 400         | Malformed request syntax  |
| `UnauthorizedException`       | 401         | Authentication required   |
| `PaymentRequiredException`    | 402         | Payment required          |
| `ForbiddenException`          | 403         | Access denied             |
| `NotFoundException`           | 404         | Resource not found        |
| `MethodNotAllowedException`   | 405         | Method not allowed        |
| `NotAcceptableException`      | 406         | Cannot produce response   |
| `ConflictException`           | 409         | Resource conflict         |
| `GoneException`               | 410         | Resource removed          |
| `PayloadTooLargeException`    | 413         | Request entity too large  |
| `UnsupportedMediaTypeException`| 415        | Media type not supported  |
| `UnprocessableEntityException`| 422        | Semantic errors           |
| `TooManyRequestsException`    | 429         | Rate limited              |
| `InternalServerErrorException`| 500       | Server error              |
| `NotImplementedException`     | 501        | Feature not implemented   |
| `BadGatewayException`         | 502        | Invalid upstream response |
| `ServiceUnavailableException` | 503        | Server unavailable        |
| `GatewayTimeoutException`     | 504        | Gateway timeout           |

### Creating Exceptions

```typescript
throw new BadRequestException("Invalid email format");

// With details
throw new BadRequestException("Validation failed", {
    details: { email: "must be a valid email" },
});

// With headers
throw new UnauthorizedException("Token expired", {
    headers: { "www-authenticate": "Bearer" },
});

// Direct HttpException
throw new HttpException(418, "I'm a teapot");
```

---

## Response Helpers

The `@sim-lu/error` package provides response builder functions:

### Success Responses

```typescript
import { ok, created, noContent } from "@sim-lu/error";

// ok(data, statusCode?, meta?)
const response = ok({ id: 1, name: "User" });
// → { success: true, statusCode: 200, data: { id: 1, name: "User" } }

// created(data, meta?)
const createdResponse = created({ id: 1, name: "User" });
// → { success: true, statusCode: 201, data: { id: 1, name: "User" } }

// noContent()
const emptyResponse = noContent();
// → { success: true, statusCode: 204, data: null }
```

### Failure Responses

```typescript
import { fail } from "@sim-lu/error";

const error = fail(404, "User not found", { userId: "abc123" });
// → { success: false, statusCode: 404, error: "Not Found", message: "User not found", details: { userId: "abc123" } }
```

### Response Types

```typescript
interface SuccessResponse<T> {
    readonly success: true;
    readonly statusCode: number;
    readonly data: T;
    readonly meta?: Record<string, unknown>;
}

interface FailureResponse {
    readonly success: false;
    readonly statusCode: number;
    readonly error: string;
    readonly message: string;
    readonly details?: unknown;
}

type ApiResponse<T> = SuccessResponse<T> | FailureResponse;
```

---

## Error Normalization

`normalizeError()` converts any thrown value into a `NormalizedError`:

```typescript
interface NormalizedError {
    readonly statusCode: number;
    readonly error: string;
    readonly message: string;
    readonly details: unknown;
    readonly headers: Record<string, string | string[]>;
    readonly stack: string | undefined;
    readonly name: string;
    readonly cause: unknown;
    readonly exception: unknown;
}
```

### Normalization Rules

```text
Thrown value
    ↓
normalizeError(exception)
    ↓
┌─────────────────────────────────────┐
│ isHttpException(exception)?         │
│ → Yes: statusCode, error, message   │
│        from exception fields        │
│ → No: instanceof Error?             │
│          → Yes: 500 Internal Server│
│          → No: 500 Internal Server │
└─────────────────────────────────────┘
```

---

## Exception Filters

### Custom Exception Filter

```typescript
import { Catch, UseFilters, type ExceptionFilter } from "@sim-lu/core";

@Catch(HttpException, ValidationException)
export class CustomExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, context: ExceptionCatchContext): FailureResponse {
        // Log the error
        console.error(exception);

        // Build custom response
        return fail(500, "Custom error message", {
            details: exception instanceof Error ? exception.stack : undefined,
        });
    }
}
```

### Registering Filters

```typescript
// Global
app.useGlobalFilters(CustomExceptionFilter);

// Class level
@UseFilters(CustomExceptionFilter)
@Controller()
export class AppController {}

// Method level
@Get()
@UseFilters(CustomExceptionFilter)
public handler() {}
```

### Catch-All Filters

```typescript
@Catch()  // No arguments = catches all exceptions
export class CatchAllFilter implements ExceptionFilter {
    catch(exception: unknown, context: ExceptionCatchContext) {
        // Handle any exception type
    }
}
```

### Filter Resolution Order

Filters are evaluated in **reverse registration order** (most specific to most general):

```text
Method-level filters  ← checked first
    ↓
Controller-level filters
    ↓
Global filters (app.useGlobalFilters)
    ↓
DefaultExceptionFilter (fallback)
```

---

## Default Exception Filter

The `DefaultExceptionFilter` is the system-wide fallback, automatically configured by the platform adapter.

### What It Does

1. Creates an `ErrorHandler` with platform-specific configuration
2. On exception:
   - Calls `ErrorHandler.handle()` → `SerializedBody` (with logging)
   - Returns the `SerializedBody` directly as its `catch()` result

The `DefaultExceptionFilter` does **not** write to the response. It returns a `SerializedBody` object that flows back through `ExecutionEngine.execute()` → `RequestExecutor.executeHttp()`, which applies it to `MutableHttpResponse` (status, headers, payload) as the single authoritative write.

### Configuration

```typescript
// The adapter sets this up automatically:
new DefaultExceptionFilter({
    platform: "express",  // or "uws"
    console: false,       // Log to console?
    includeDetails: true, // Include stack traces in production?
    includeStack: false,  // Include stack in payload?
});
```

### Response Ownership

`DefaultExceptionFilter.catch()` returns a `SerializedBody` object. The `ExecutionEngine.execute()` method detects `isSerializedBody(result)` and skips `PipeExecutor` and `TransformerExecutor` — the response is already finalized. `RequestExecutor.executeHttp()` then applies the `SerializedBody` to the `MutableHttpResponse` (sets status, headers, and payload). This ensures a single authoritative write path for error responses.

---

## Platform Error Handling

### Express Adapter

```text
Exception propagates from handler
    ↓
try { handler(request, writer) } catch { next(exception) }
    ↓
Express error-handling middleware:
(exception, request, response, _next) => {
    writeSerialized(
        response,
        handleAdapterError(
            errorHandler,
            exception,
            snapshotRequest({...})
        )
    );
}
```

### uWS Adapter (Native)

```text
Exception propagates from handler in dispatchUws()
    ↓
catch (exception) {
    if (!aborted) {
        writeSerializedUws(
            response,
            handleAdapterError(
                errorHandler,
                exception,
                requestSnapshot
            )
        );
    }
}
```

### Node.js Fallback (NodeHttpKernel)

The `NodeHttpKernel.handle()` method provides structured JSON error handling for the fallback path:
- Sets `x-request-id` and `x-trace-id` response headers on every request
- 404: Calls `notFoundBody()` → `writeSerializedNode()` → structured JSON
- 500: Catches exception → `handleAdapterError()` → `writeSerializedNode()` → structured JSON

This is consistent with the Express and uWS native paths. When uWS is unavailable, `UwsAdapter.listen()` delegates to `super.listen()` which uses this base class `handle()` override.

---

## Error Logging

### ErrorHandler

```typescript
const handler = new ErrorHandler({
    platform: "express",
    console: false,         // Log to console
    includeDetails: true,   // Include details in response
    includeStack: false,    // Include stack trace in response
    service: "my-service",  // Service name for logs
});
```

### Normalized Error Logging

```typescript
// Called automatically by ErrorHandler.handle()
logNormalizedError(logger, normalized, request, platform);
```

Logs include:
- `requestId`
- `traceId`
- `statusCode`
- `error`
- `message`
- `stack` (if available)
- `context.platform`
- `context.service`

### Log Targets

| Target             | Description                         |
| ------------------ | ----------------------------------- |
| Console (default)  | Console output                      |
| `MemoryLogTarget`  | In-memory buffer for testing        |
| `ElasticLogTarget` | Elasticsearch                      |
| `StreamLogTarget`  | Writable stream                    |
| `WebhookLogTarget` | HTTP webhook                       |
| `AdapterLogTarget` | Configurable with custom transformer |

---

## Request Correlation

### Correlation Utilities

```typescript
import {
    generateRequestId,
    generateTraceId,
    generateSpanId,
    extractRequestId,
    extractTraceId,
} from "@sim-lu/common";
```

### Request ID / Trace ID Flow

```text
┌─────────────────────────────────────────────────────────────┐
│              Incoming HTTP Request                           │
│                                                              │
│  Headers:                                                    │
│    x-request-id  (or x-correlation-id)                      │
│    x-trace-id                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          Platform Adapter                                  │
│                                                              │
│  request = extractRequestId(headers) ?? generateRequestId()  │
│  trace  = extractTraceId(headers) ?? generateTraceId()       │
│                                                              │
│  Set response headers:                                       │
│    x-request-id    → response                                │
│    x-trace-id      → response                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         RequestExecutor.executeHttp()                        │
│                                                              │
│  Sets context:                                               │
│    request (HttpRequest with requestId, traceId)            │
│    response (MutableHttpResponse)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          ExecutionContext                                   │
│                                                              │
│  Available via context.get("request"), context.get("response")│
│  Accessible in guards, interceptors, pipes, filters,        │
│  transformers, and parameter decorators (@Ctx())             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│        Error Handling (if exception thrown)                  │
│                                                              │
│  DefaultExceptionFilter / ErrorHandler:                      │
│    snapshotRequest(request) → captures request context        │
│    logNormalizedError(logger, normalized, snapshot, platform)│
│                                                             │
│  Logs include: requestId, traceId, statusCode, error,      │
│    message, stack, platform, service                       │
└─────────────────────────────────────────────────────────────┘
```

### RequestSnapshot

```typescript
interface RequestSnapshot {
    readonly method?: string;
    readonly url?: string;
    readonly ip?: string;
    readonly userAgent?: string;
    readonly requestId?: string;
    readonly traceId?: string;
}
```

---

## Testing Error Handling

When testing error handling, verify:

```text
✓ controller error        — handler throws exception
✓ guard error             — guard throws
✓ pipe error              — pipe throws
✓ interceptor error       — interceptor throws
✓ transformer error       — transformer throws
✓ adapter error           — error from adapter layer
✓ 404 (no route)          — unmatched route
✓ 400 Bad Request         — BadRequestException
✓ 401 Unauthorized        — UnauthorizedException
✓ 403 Forbidden           — guard denial / ForbiddenException
✓ 404 Not Found           — NotFoundException
✓ 409 Conflict            — ConflictException
✓ 500 Internal Server     — unhandled Error
✓ Exception filter matching — @Catch types vs thrown exception
✓ Catch-all filter        — @Catch() with no types
✓ Filter ordering         — method → controller → global
✓ Logging                 — structured error logs with correlation IDs
✓ Response format         — consistent JSON error body
```
