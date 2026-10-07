# Framework Architecture Hardening Plan

## Purpose

This document defines the architecture-hardening work that should be
completed before adding the next major framework subsystems.

The current `@sim-lu` framework has a broad runtime surface: dependency
injection, modules, routing, HTTP and WebSocket execution, guards,
pipes, interceptors, exception filters, transformers, lifecycle hooks,
Express/uWS adapters, error handling, logging, correlation IDs, and
database abstractions.

The current server test baseline is:

-   630 tests passing
-   60 test files
-   TypeScript typecheck passing
-   Build passing

The goal of this phase is **not to add many new features**. The goal is
to make the existing architecture internally consistent, deterministic,
and safe to extend.

------------------------------------------------------------------------

# 1. Current Architecture

The framework is organized into these major packages:

``` text
@sim-lu/common
        ↓
@sim-lu/http
        ↓
@sim-lu/core
        ↓
platform-express
platform-uws
```

Supporting packages include:

``` text
@sim-lu/error
@sim-lu/database
```

## Package responsibilities

### `@sim-lu/common`

Framework-independent:

-   decorators
-   metadata
-   interfaces
-   shared types
-   lifecycle contracts
-   correlation utilities

It must not depend on Express or uWebSockets.js.

### `@sim-lu/http`

Transport-neutral:

-   `HttpRequest`
-   `HttpResponse`
-   `HttpConnection`
-   WebSocket socket/context/message abstractions

It must not expose Express- or uWS-specific implementation details.

### `@sim-lu/core`

Runtime orchestration:

-   dependency injection
-   modules
-   controllers
-   routing
-   execution engine
-   guards
-   pipes
-   interceptors
-   exception filters
-   transformers
-   lifecycle
-   adapter contracts
-   request execution

Core must remain platform independent.

### `@sim-lu/error`

Owns:

-   HTTP exceptions
-   response/error serialization
-   error normalization
-   error handlers
-   default exception filtering
-   structured logging
-   HTTP status utilities
-   safe JSON serialization
-   upload error utilities

Adapters should reuse these semantics instead of implementing competing
error serialization.

### `@sim-lu/platform-express`

Express-specific HTTP implementation.

### `@sim-lu/platform-uws`

uWebSockets.js-specific HTTP/WebSocket implementation.

### `@sim-lu/database`

Database abstraction and implementations.

------------------------------------------------------------------------

# 2. Architecture-Hardening Goal

The framework currently works end-to-end, but the architecture review
identified several areas where implementation details and framework
contracts need to be made explicit.

The hardening phase covers:

1.  Async factory providers
2.  Response/error ownership
3.  Node fallback error consistency
4.  WebSocket context
5.  Express/uWS error contract
6.  DI scope semantics
7.  Regression tests
8.  Documentation synchronization

The work should be done incrementally.

Do not combine all of these into one large refactor.

------------------------------------------------------------------------

# 3. P0 --- Async Factory Providers

## Current situation

The DI container supports factory providers:

``` ts
{
  token: SomeToken,
  useFactory: (...deps) => value,
  inject: [DepA, DepB],
}
```

The current implementation calls the factory but does not await its
return value.

Therefore:

``` ts
useFactory: async () => {
  return createService();
}
```

can result in:

``` text
Promise<Service>
```

being stored as the provider value instead of:

``` text
Service
```

## Why this matters

Async initialization is common for:

-   database connections
-   configuration loading
-   secrets
-   external clients
-   caches
-   message queues
-   SDK initialization

A DI framework should have deterministic semantics for asynchronous
provider factories.

## Desired behavior

Conceptually:

``` text
FactoryProvider
      ↓
resolve injected dependencies
      ↓
factory.useFactory(...)
      ↓
await result
      ↓
provider value
```

Both synchronous and asynchronous factories should work:

``` ts
useFactory: () => service
```

and:

``` ts
useFactory: async () => service
```

## Important design question

Before implementing, verify whether the container's resolution API is
already asynchronous or whether it must become asynchronous.

Do not introduce partial async behavior where:

``` text
some providers await
some providers don't
```

The provider resolution contract must be internally consistent.

## Required tests

Add tests for:

-   synchronous factory
-   asynchronous factory
-   async factory with injected dependencies
-   rejected async factory
-   multiple async providers
-   dependent provider receiving an async factory result
-   startup failure caused by rejected factory

------------------------------------------------------------------------

# 4. P0/P1 --- Response Ownership and Exception Filters

## Current situation

The execution engine catches exceptions and invokes the exception filter
chain.

The default exception filter currently performs two responsibilities:

``` text
1. create/serialize the error response
2. write that response directly to MutableHttpResponse
```

It also returns a `FailureResponse`.

This creates two potential response paths:

``` text
Exception
    ↓
DefaultExceptionFilter
    ├── writes response
    │
    └── returns FailureResponse
            ↓
       execution pipeline
            ↓
       RequestExecutor
```

The returned result may continue through pipes and transformers even
though the HTTP response has already been written.

## Why this matters

There should be one authoritative response ownership model.

Otherwise future features such as:

-   response transformers
-   middleware
-   compression
-   response interceptors
-   metrics
-   streaming

can become ambiguous.

## Decision that must be made

Choose one of these architectural models.

### Model A --- Filters return responses

``` text
Exception
    ↓
ExceptionFilter
    ↓
FailureResponse
    ↓
execution result processing
    ↓
RequestExecutor
    ↓
Adapter writes response
```

Advantages:

-   one response writer
-   transformations can be applied consistently
-   adapter owns transport output

### Model B --- Filters are terminal response writers

``` text
Exception
    ↓
ExceptionFilter
    ↓
writes response
    ↓
execution terminates
```

Advantages:

-   useful for special/streaming responses
-   explicit terminal behavior

But then the filter must not also return a result that is treated as a
normal handler result.

## Recommendation for this framework

Prefer a single normal response path for ordinary HTTP responses.

Exception filters should produce a framework-level response result
unless the framework explicitly supports terminal response writing.

Do not implement both behaviors implicitly.

## Required tests

Test:

-   custom filter
-   default filter
-   filter result transformation
-   filter response status
-   filter response body
-   filter headers
-   filter throwing another error
-   no double write
-   response sent exactly once

------------------------------------------------------------------------

# 5. P1 --- Node Fallback Error Consistency

## Current situation

The framework has a `NodeHttpKernel` fallback.

The native Express and uWS paths use structured error handling, while
the architecture review identified cases where the Node kernel can
return plain text for errors such as:

``` text
Not Found
Internal Server Error
```

while other paths return structured JSON error responses.

## Problem

The same framework application can therefore produce different response
semantics depending on which platform path is active.

For example:

``` text
uWS native
    → structured JSON

Express
    → structured JSON

Node fallback
    → plain text
```

That violates adapter-level semantic consistency.

## Desired contract

For equivalent requests, platform selection should not unexpectedly
change:

-   status code
-   error response shape
-   content type
-   correlation headers

unless the platform explicitly documents a difference.

## Required work

Centralize error response generation through the existing error package.

The fallback should use the same:

``` text
normalizeError()
toFailureResponse()
ErrorHandler
handleAdapterError()
notFoundBody()
```

semantics already used elsewhere.

## Required tests

Run the same error contract against:

-   Express
-   native uWS
-   Node fallback

Verify:

``` text
404
400
500
Content-Type
response body
request ID
trace ID
```

------------------------------------------------------------------------

# 6. P1 --- WebSocket Context

## Current situation

The framework exposes:

``` ts
@WsSocket()
@WsMessage()
@WsContext()
```

The current architecture documentation identifies a known issue:

``` text
@WsContext()
    ↓
context.get("ws.context")
    ↓
undefined
```

because the adapters do not currently populate `ws.context`.

`@Ctx()` can provide the framework `ExecutionContext`, but that is not
necessarily equivalent to the intended `WsContext` abstraction.

## Required design decision

Define what `WsContext` represents.

It should be a transport-level WebSocket context, not merely an alias
for `ExecutionContext`.

Potential contents include:

``` text
socket
message
params
query
headers
cookies
state
```

The exact contract must match the existing HTTP/WebSocket abstractions.

## Desired flow

``` text
WebSocket adapter
       ↓
create WebSocket context
       ↓
ExecutionContext state
       ↓
ParameterResolver
       ↓
@WsContext()
```

## Required tests

Test:

-   `@WsSocket()`
-   `@WsMessage()`
-   `@WsContext()`
-   context identity
-   connection-specific state
-   concurrent socket isolation

------------------------------------------------------------------------

# 7. P1 --- Express/uWS Error Contract

Express and uWS use different mechanisms:

``` text
Express
    ↓
Express error middleware

uWS
    ↓
try/catch
    ↓
handleAdapterError()
```

Platform-specific mechanisms are fine.

The resulting framework behavior must still be equivalent.

## Contract

For equivalent exceptions:

``` text
same status
same response shape
same headers
same correlation behavior
same serialization rules
```

The implementation may differ.

The observable framework contract should not.

## Adapter contract testing

Maintain shared semantic tests.

Conceptually:

``` ts
describeHttpErrorContract("express", ...)
describeHttpErrorContract("uws", ...)
describeHttpErrorContract("node", ...)
```

Avoid copying dozens of nearly identical tests manually when a reusable
contract helper is practical.

------------------------------------------------------------------------

# 8. P1 --- Dependency Injection Scope Semantics

The metadata model recognizes:

``` text
singleton
request
transient
```

but the architecture currently indicates that providers are effectively
singleton.

This must not be left ambiguous.

## Define singleton

Example:

``` text
Application
    ↓
Service A
    ↓
Service B
```

A singleton provider has one defined lifetime within its intended
container/application scope.

Document whether the lifetime is:

-   application-wide
-   module-container-wide
-   another explicit scope

Do not infer this from implementation accidents.

## Define request scope

A request-scoped provider should have a lifetime associated with one
execution request.

For HTTP:

``` text
Request A
  └── Service instance A

Request B
  └── Service instance B
```

For WebSockets, define whether scope means:

-   connection lifetime
-   message/event lifetime
-   another explicit lifetime

Do not implement until this is decided.

## Define transient scope

Transient generally means a new instance is produced for each
resolution/injection according to the framework's defined semantics.

Again, define this precisely before implementation.

## Required tests

For every scope:

-   same request behavior
-   different request behavior
-   nested dependency behavior
-   multiple injections
-   controller/service identity
-   concurrent requests
-   WebSocket behavior if applicable
-   lifecycle behavior

------------------------------------------------------------------------

# 9. Architecture Rule: Do Not Leak Platform Details

Maintain:

``` text
common
    ↓
http abstractions
    ↓
core
    ↓
platform implementation
```

Do not allow:

``` text
core → express
core → uWS
http → express
http → uWS
common → express
common → uWS
```

Platform-specific APIs belong in platform packages.

For example, native uWS parameter extraction:

``` ts
request.getParams()
```

belongs inside the uWS adapter.

The resulting framework request should expose:

``` ts
request.params
```

without exposing uWS itself.

------------------------------------------------------------------------

# 10. Routing Contract

The framework supports:

``` text
exact routes
dynamic parameters
wildcards
route specificity
```

The fallback Node kernel performs matching when necessary.

Native Express and uWS routing can use their own routing systems.

The framework contract must remain:

``` text
/users/me
```

wins over:

``` text
/users/:id
```

which wins over:

``` text
/users/*
```

when applicable.

Do not add a second routing layer to native adapters unless it is
required.

------------------------------------------------------------------------

# 11. Execution Pipeline Contract

The current execution model is conceptually:

``` text
RequestExecutor
      ↓
ExecutionDispatcher
      ↓
ExecutionPipeline
      ↓
ExecutionEngine
      ↓
Interceptors
      ↓
Guards
      ↓
Parameter resolution
      ↓
Parameter pipes
      ↓
Handler
      ↓
Route-level pipes
      ↓
Transformers
      ↓
Response
```

Exception handling surrounds the execution path.

The two pipe systems must remain distinct:

``` text
Parameter pipes
    ↓
individual parameter
    ↓
BEFORE handler
```

versus:

``` text
@UsePipes
    ↓
handler result
    ↓
AFTER handler
```

Do not merge their metadata or semantics.

------------------------------------------------------------------------

# 12. HTTP Response Contract

The framework response abstraction must preserve status codes.

Examples:

``` text
ok()
    → 200

created()
    → 201

noContent()
    → 204

FailureResponse
    → appropriate error status
```

The response flow should remain:

``` text
Controller
    ↓
SuccessResponse / FailureResponse
    ↓
RequestExecutor
    ↓
MutableHttpResponse
    ↓
Adapter
    ↓
actual HTTP response
```

Adapters must never blindly force every successful result to `200`.

------------------------------------------------------------------------

# 13. WebSocket Contract

HTTP and WebSocket share the execution engine, but transport-specific
state must remain explicit.

HTTP:

``` text
transport = http
```

WebSocket:

``` text
transport = websocket
```

The execution engine can share:

-   guards
-   interceptors
-   pipes
-   filters
-   transformers
-   DI

while the parameter resolver and transport context provide the correct
transport-specific values.

Do not assume HTTP response semantics apply to WebSockets.

------------------------------------------------------------------------

# 14. Lifecycle Contract

The application lifecycle should remain deterministic.

Startup:

``` text
compile modules
    ↓
compose containers
    ↓
instantiate providers/controllers
    ↓
discover routes
    ↓
OnModuleInit
    ↓
OnApplicationBootstrap
    ↓
plugins
    ↓
listen
```

Shutdown should be defined in reverse/resource-safe order.

Any new infrastructure such as:

-   database
-   configuration
-   plugins
-   metrics
-   queues

must integrate into this lifecycle rather than creating independent
startup/shutdown systems.

------------------------------------------------------------------------

# 15. Testing Strategy for Architecture Hardening

Every architecture change must include the appropriate test level.

## Unit

Use for:

-   provider resolution
-   metadata
-   executors
-   serialization
-   utilities

## Integration

Use for:

-   DI + modules
-   execution + guards
-   execution + pipes
-   execution + filters
-   execution + transformers
-   lifecycle + application

## Adapter contract

Use for:

-   Express
-   uWS
-   Node fallback

## E2E

Use real application instances and real requests/sockets.

------------------------------------------------------------------------

# 16. Regression Test Requirements

Every discovered architectural bug must become a permanent regression
test.

At minimum:

``` text
async factory
    → resolved value, not Promise

guard denial
    → 403

created()
    → HTTP 201

noContent()
    → HTTP 204

Node fallback
    → structured error response

@WsContext()
    → actual WebSocket context

exception filter
    → exactly one response write
```

Do not remove these tests after the implementation is fixed.

------------------------------------------------------------------------

# 17. Recommended Work Order

Use this exact order unless repository inspection reveals a dependency
that requires otherwise.

``` text
Phase 1
Architecture audit
        ↓
Phase 2
Async factory providers
        ↓
Phase 3
Exception-filter/response ownership
        ↓
Phase 4
Node fallback error consistency
        ↓
Phase 5
WebSocket context
        ↓
Phase 6
Express/uWS error contract
        ↓
Phase 7
DI scope design
        ↓
Phase 8
DI scope implementation
        ↓
Phase 9
Regression test expansion
        ↓
Phase 10
Architecture/documentation freeze
```

Do not start middleware, configuration, plugins, or other major
subsystems until the P0/P1 issues above are resolved or explicitly
accepted as documented limitations.

------------------------------------------------------------------------

# 18. What Not To Do

Do not:

-   rewrite the framework
-   replace the DI container without evidence
-   replace the router without evidence
-   introduce Express/uWS dependencies into core
-   create duplicate error serializers
-   create duplicate routing systems
-   weaken tests to match implementation
-   remove regression tests
-   add dependencies without necessity
-   implement every possible DI scope without defining semantics
-   add middleware before defining its position in the pipeline
-   add configuration before defining its lifecycle
-   add a plugin system that bypasses application lifecycle

------------------------------------------------------------------------

# 19. Completion Criteria

Architecture hardening is complete when:

``` text
[x] Async factory providers have defined semantics
[x] Async factory tests pass
[x] Exception response ownership is unambiguous
[x] No double-write response path exists
[x] Node fallback errors match framework error semantics
[x] @WsContext() has a defined and tested contract
[x] Express/uWS error behavior passes shared contract tests
[x] DI scope semantics are explicitly defined
[x] Implemented scopes have integration tests
[x] Existing 648+ tests continue to pass
[x] Typecheck passes
[x] Build passes
[x] FEATURES.md reflects reality
[x] ARCHITECTURE.md reflects reality
[x] AGENTS.md reflects reality
```

------------------------------------------------------------------------

# 20. After Architecture Hardening

Only after this phase should the framework proceed to the next major
subsystem roadmap:

``` text
Architecture hardening
        ↓
HTTP/WebSocket contract freeze
        ↓
DI semantics
        ↓
Middleware
        ↓
Configuration
        ↓
Plugin system
        ↓
Observability
        ↓
Database contract hardening
        ↓
Security hardening
        ↓
Examples
        ↓
Documentation
        ↓
Release engineering
        ↓
v1
```

The purpose of this order is to establish stable contracts first. New
framework features should build on those contracts rather than forcing
repeated changes to the runtime architecture.

------------------------------------------------------------------------

# 21. Agent Operating Rule

When working on this framework:

``` text
Inspect
  ↓
Understand current behavior
  ↓
Identify contract
  ↓
Write/adjust regression test
  ↓
Implement smallest correct change
  ↓
Run tests
  ↓
Run typecheck
  ↓
Run build
  ↓
Update documentation
```

The framework should become more predictable after every change.

The primary engineering objective is not maximum feature count.

It is:

``` text
stable contracts
+
clear ownership
+
platform independence
+
deterministic execution
+
strong tests
+
accurate documentation
```