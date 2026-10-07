# Execution Pipeline Guide

This guide explains the complete execution pipeline of the `@sim-lu` framework, including ordering, data flow, and component responsibilities.

---

## Table of Contents

1. [Pipeline Overview](#pipeline-overview)
2. [Component Map](#component-map)
3. [Detailed Stage Breakdown](#detailed-stage-breakdown)
4. [Interceptors](#interceptors)
5. [Guards](#guards)
6. [Parameter Resolution](#parameter-resolution)
7. [Parameter Pipes](#parameter-pipes)
8. [Route-Level Pipes](#route-level-pipes)
9. [Exception Filters](#exception-filters)
10. [Transformers](#transformers)
11. [Two Pipe Systems (Important)](#two-pipe-systems-important)
12. [Lifecycle Integration](#lifecycle-integration)

---

## Pipeline Overview

The execution pipeline processes every incoming request—whether HTTP or WebSocket—through the same set of stages. The conceptual flow is:

```text
Incoming request
      ↓
ExecutionDispatcher
      ↓
ExecutionPipeline         (middleware chain, currently empty)
      ↓
ExecutionEngine
      ├── try:
      │     ├── InterceptorExecutor     (wraps everything, before/after hooks)
      │     ├── GuardExecutor           (throws ForbiddenException on denial)
      │     ├── ExecutionRunner
      │     │     ├── ParameterResolver       (@Param, @Query, @Body, etc.)
      │     │     ├── ParameterPipeExecutor   (per-parameter pipes)
      │     │     └── HandlerRef.invoke()     (actual controller method)
      │     └── InterceptorExecutor     (after hooks)
      ├── catch (exception):
      │     ExceptionFilterExecutor     (handles @Catch / @UseFilters)
      ├── PipeExecutor                (route-level @UsePipes on result)
      └── TransformerExecutor         (transforms result)
      ↓
Response
```

### Actual Execution Order

```text
┌─────────────────────────────────────────────────────────────────┐
│                        ExecutionEngine.execute()                │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ try:                                                          │
│   InterceptorExecutor.execute(handler, context, next)         │
│   - Calls next() which is:                                    │
│     GuardExecutor.execute(handler, guardContext)              │
│     → if guard returns false → throws ForbiddenException      │
│     → ExecutionRunner.execute(handler, context)               │
│       → ParameterResolver.resolve(handler, context)           │
│       → ParameterPipeExecutor.execute(args, pipes, context)   │
│       → HandlerRef.invoke(args)                              │
└──────────────────────────────────────┬────────────────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        │                             │
                        ▼                             ▼
              No exception                 Exception thrown
                        │                             │
                        ▼                             ▼
┌─────────────────────────────────┐   ┌──────────────────────────────────────┐
│ PipeExecutor.execute(result)    │   │ ExceptionFilterExecutor.execute(     │
│ - route-level @UsePipes         │   │   exception, handler, context)       │
│ - transforms handler output     │   │ - matches @Catch types               │
│                                 │   │ - fallback: DefaultExceptionFilter   │
└─────────────────┬─────────────┘   └─────────────────┬────────────────────┘
                  │                                   │
                  ▼                                   ▼
┌─────────────────────────────────┐   ┌──────────────────────────────────────┐
│ TransformerExecutor.execute()   │   │ TransformerExecutor.execute()        │
│ - @UseTransformers              │   │ - @UseTransformers                   │
│ - transforms result             │   │ - transforms result (including       │
│                                 │   │   error responses)                   │
└─────────────────────────────────┘   └──────────────────────────────────────┘
```

---

## Component Map

| Component                | Package              | File                                    |
| ------------------------ | -------------------- | --------------------------------------- |
| `ExecutionDispatcher`    | `@sim-lu/core`       | `execution/execution-dispatcher.ts`     |
| `ExecutionPipeline`      | `@sim-lu/core`       | `execution/execution-pipeline.ts`       |
| `ExecutionEngine`         | `@sim-lu/core`       | `execution/execution-engine.ts`         |
| `ExecutionRunner`         | `@sim-lu/core`       | `execution/execution-runner.ts`         |
| `ExecutionContext`        | `@sim-lu/core`       | `execution/execution-context.ts`        |
| `HandlerRef`            | `@sim-lu/core`       | `execution/handler-ref.ts`              |
| `InterceptorExecutor`   | `@sim-lu/core`       | `interceptor/interceptor-executor.ts`   |
| `GuardExecutor`         | `@sim-lu/core`       | `guard/guard-executor.ts`               |
| `ParameterResolver`     | `@sim-lu/core`       | `parameter/parameter-resolver.ts`       |
| `ParameterPipeExecutor` | `@sim-lu/core`       | `parameter/parameter-pipe-executor.ts` |
| `PipeExecutor`          | `@sim-lu/core`       | `pipe/pipe-executor.ts`                 |
| `ExceptionFilterExecutor`| `@sim-lu/core`      | `exception-filter/exception-filter-executor.ts` |
| `TransformerExecutor`   | `@sim-lu/core`       | `transform/transformer-executor.ts`     |

---

## Detailed Stage Breakdown

### ExecutionDispatcher → ExecutionPipeline → ExecutionEngine

```text
┌─────────────────────────────────────────────────┐
│ ExecutionDispatcher.execute()                   │
│ - Receives HandlerRef + ExecutionContext         │
│ - Delegates to ExecutionPipeline                │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ ExecutionPipeline.execute()                     │
│ - Applies registered middleware (currently none)│
│ - Delegates to ExecutionEngine.execute()        │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ ExecutionEngine.execute()                       │
│ - Orchestrates the full pipeline                │
│ - Manages interceptor nesting                   │
│ - Catches exceptions for filter dispatch         │
│ - Applies route-level pipes and transformers    │
└─────────────────────────────────────────────────┘
```

### Factory Wiring

The `createExecutionDispatcher()` function in `adapter/execution-factory.ts` wires all executors together:

```typescript
// execution-factory.ts
export function createExecutionDispatcher(
    container: Container,
    options: ExecutionFactoryOptions,
): ExecutionDispatcher {
    const pipeline = new ExecutionPipeline();
    const parameterResolver = new ParameterResolver(new ParameterMetadataResolver());
    const parameterPipeExecutor = new ParameterPipeExecutor(new PipeRegistry(container));
    const runner = new ExecutionRunner(parameterResolver, parameterPipeExecutor);

    const engine = new ExecutionEngine(
        new TransformerExecutor(/* metadata + registry */),
        new ExceptionFilterExecutor(/* metadata + registry + fallback */),
        new InterceptorExecutor(/* metadata + registry */),
        new GuardExecutor(/* metadata + registry */),
        runner,
        new PipeExecutor(/* metadata + registry */),
    );

    return new ExecutionDispatcher(pipeline, engine);
}
```

---

## Interceptors

Interceptors wrap handler execution, allowing code to run before and after the handler.

### Interface

```typescript
export interface Interceptor<TController extends object = object> {
    intercept(
        context: ExecutionContext<TController>,
        next: () => unknown | Promise<unknown>,
    ): unknown | Promise<unknown>;
}
```

### Nesting Order

Interceptors are nested like an onion. If you register `[InterceptorA, InterceptorB]`:

```text
InterceptorA.intercept(ctx, nextA)
  ├─ (before A)
  ├─ nextA() → InterceptorB.intercept(ctx, nextB)
  │    ├─ (before B)
  │    ├─ nextB() → Guard → Handler
  │    └─ (after B)
  └─ (after A)
```

### Registration

```typescript
// Global
app.useGlobalInterceptors(LoggingInterceptor);

// Class level
@UseInterceptors(LoggingInterceptor)
@Controller()
export class MyController {}

// Method level
@Get()
@UseInterceptors(CacheInterceptor)
public myHandler() {}
```

---

## Guards

Guards run before the handler. They return `boolean` (or `Promise<boolean>`). Returning `false` denies access.

### Interface

```typescript
export interface Guard<TController extends object = object> {
    canActivate(context: GuardContext<TController>): boolean | Promise<boolean>;
}
```

### Denial Semantics

```text
Guard.canActivate() returns false
    ↓
GuardExecutor throws ForbiddenException("Execution denied by guard")
    ↓
ExceptionFilterExecutor catches it
    ↓
DefaultExceptionFilter or @Catch(ForbiddenException) handles → 403
```

### Registration

```typescript
// Global
app.useGlobalGuards(AuthGuard);

// Class level
@UseGuards(AuthGuard)
@Controller("secure")
export class SecureController {}

// Method level
@Get()
@UseGuards(PaymentRequiredGuard)
public premiumFeature() {}
```

---

## Parameter Resolution

`ParameterResolver` reads `METADATA_KEYS.PARAM` metadata to determine which parameter decorator was applied, then resolves values from the `ExecutionContext`.

### Resolution Map

| Parameter Type | Context Key | Source |
| -------------- | ----------- | ------ |
| `context`      | —           | Returns `ExecutionContext` itself |
| `request`      | `"request"` | `HttpRequest` object |
| `response`     | `"response"`| `MutableHttpResponse` |
| `param`        | `"params"`  | `request.params[name]` |
| `query`        | `"query"`   | `request.query[name]` |
| `header`       | `"headers"` | `request.headers[name]` |
| `cookie`       | `"cookies"` | `request.cookies[name]` |
| `body`         | `"body"`    | `request.body` |
| `session`      | `"session"` | `context.get("session")` |
| `ws-socket`    | `"ws.socket"` | WebSocket socket object |
| `ws-message`   | `"ws.message"` | WebSocket message string |
| `ws-context`   | `"ws.context"` | ⚠ Returns `undefined` — no adapter sets this key |

### Parameter Metadata

```typescript
interface ParameterMetadata {
    type: ParameterType;          // e.g. "param", "query", "body"
    index: number;                // parameter position in method signature
    name?: string;               // optional name (@Param("id"))
    required?: boolean;          // throws if missing
    default?: unknown;           // fallback value if missing
    handler: string | symbol;     // method name for filtering
}
```

---

## Parameter Pipes

Parameter pipes operate on individual resolved parameters **before** the handler is invoked. They are registered at the parameter level, not via `@UsePipes()`.

### Interface

```typescript
export interface Pipe<TInput = unknown, TOutput = TInput> {
    transform(value: TInput, context: ExecutionContext): TOutput | Promise<TOutput>;
}
```

### Execution

```text
ParameterResolver.resolve() → args[]
    ↓
ParameterPipeExecutor.execute(args, parameterPipes, context)
    ↓
For each parameter pipe:
    pipe.transform(args[pipe.index], context)
    → args[pipe.index] = transformed value
    ↓
HandlerRef.invoke(transformedArgs)
```

### Registration (Parameter Level)

Parameter-level pipes are stored in `METADATA_KEYS.PARAMETER_PIPES`:

```typescript
@Get(":id")
public getUser(
    @Param("id", { pipes: [ParseIntPipe, ValidatePipe] }) id: number,
) {}
```

---

## Route-Level Pipes

Route-level pipes are registered via `@UsePipes()` at the class or method level. They operate on the handler's **return value** after execution.

### Interface

Same `Pipe` interface — `transform(value, context)`.

### Execution

```text
Handler returns → result
    ↓
PipeExecutor.execute(result, handler, pipeContext)
    ↓
For each pipe (in order):
    pipe.transform(currentValue, pipeContext.execution)
    → currentValue = transformed result
    ↓
Return transformed result
```

### Registration

```typescript
@UsePipes(ValidationPipe)  // class-level: applies to all handlers
@Controller()
export class MyController {
    @Get()
    @UsePipes(CacheablePipe)  // method-level: applies to this handler only
    public handler() {}
}
```

The `PipeMetadata` class reads from `METADATA_KEYS.PIPE` at both controller and handler levels, then merges them.

---

## Exception Filters

Exception filters handle thrown exceptions from the execution pipeline.

### Interface

```typescript
export interface ExceptionFilter<TController extends object = object> {
    catch(
        exception: unknown,
        context: ExceptionCatchContext,
    ): unknown;
}
```

### Resolution Algorithm

```text
Exception thrown
    ↓
ExceptionFilterExecutor.execute(exception, handler, context)
    ↓
Iterate filter tokens in reverse order (method → class → global)
    ↓
For each filter:
    - Read @Catch() types via METADATA_KEYS.CATCH
    - If empty array: matches all (catch-all)
    - Else: matches if exception instanceof any listed type
    ↓
First matching filter → filter.catch(exception, context) → return result
    ↓
If no match and fallback exists:
    → fallback.catch(exception, context)  (DefaultExceptionFilter)
    ↓
If no match and no fallback:
    → re-throw exception
```

### Context

The `ExceptionCatchContext` is the `ExecutionContext` itself, so filters can access `context.get("request")`, `context.get("response")`, etc.

### DefaultExceptionFilter

The `DefaultExceptionFilter` is the fallback filter set by the adapter's `ErrorHandler`:

1. Calls `ErrorHandler.handle(exception, requestSnapshot)` → gets `SerializedBody`
2. Writes `SerializedBody` to `MutableHttpResponse` (if available in context)
3. Returns `toFailureResponse(exception, includeDetails)` → `FailureResponse` object
4. The `FailureResponse` flows through `PipeExecutor` and `TransformerExecutor`

**⚠ Known Issue:** The `DefaultExceptionFilter` writes to the response AND returns a `FailureResponse`. Since `RequestExecutor.executeHttp()` checks `response.body === undefined` before sending, the `FailureResponse` return value typically does not produce a second write. However, transformers can potentially modify the `FailureResponse` without changing the already-written response body.

---

## Transformers

Transformers operate on the final result—both successful results and error responses from filters.

### Interface

```typescript
export interface Transformer<TController extends object = object> {
    transform(
        value: unknown,
        context: ExecutionContext<TController>,
    ): unknown | Promise<unknown>;
}
```

### Execution

```text
Result (success or error response)
    ↓
TransformerExecutor.execute(result, handler, context)
    ↓
For each transformer (in order):
    transformer.transform(currentValue, context)
    → currentValue = transformed result
    ↓
Return final value
    ↓
RequestExecutor sends result to response
```

### Registration

```typescript
app.useGlobalTransformers(EnvelopeTransformer);

// or per-controller/handler
@UseTransformers(EnvelopeTransformer)
```

---

## Two Pipe Systems (Important)

The framework has **two distinct pipe systems** that are often confused:

```text
┌─────────────────────────────┐     ┌─────────────────────────────┐
│    Parameter-Level Pipes    │     │   Route-Level Pipes          │
├─────────────────────────────┤     ├─────────────────────────────┤
│ Decorator: (inline)         │     │ Decorator: @UsePipes()       │
│ Metadata key:               │     │ Metadata key:                │
│   PARAMETER_PIPES           │     │   PIPE                       │
│ Executes: BEFORE handler    │     │ Executes: AFTER handler       │
│ Operates on: individual     │     │ Operates on: handler          │
│   parameters                │     │   return value                │
│ Executor:                   │     │ Executor:                    │
│   ParameterPipeExecutor     │     │   PipeExecutor                │
│ Input: args array           │     │ Input: result object          │
│ Output: transformed args    │     │ Output: transformed result    │
└─────────────────────────────┘     └─────────────────────────────┘
```

**Do not confuse:**
- `METADATA_KEYS.PARAMETER_PIPES` (per-parameter, pre-handler)
- `METADATA_KEYS.PIPE` (route-level, post-handler)

---

## Lifecycle Integration

Lifecycle hooks are invoked by `LifecycleExecutor` during application startup and shutdown, not during the request pipeline.

### Startup Sequence

```text
ApplicationContext.init()
    ├── ModuleCompiler.compile()          ← discovers modules
    ├── ContainerComposer.compose()       ← instantiates providers/controllers
    ├── RouteRegistry.exploreModules()    ← discovers routes
    ├── LifecycleExecutor.callOnModuleInit()    ← onModuleInit() in import order
    ├── LifecycleExecutor.callOnApplicationBootstrap() ← onApplicationBootstrap()
    └── Plugin registration               ← plugin.register()
```

### Shutdown Sequence

```text
ApplicationContext.close()
    ├── adapter.close()                  ← stop accepting requests
    ├── closeHooks                       ← registered onClose hooks (reverse order)
    ├── LifecycleExecutor.callBeforeApplicationShutdown(reverse)
    ├── LifecycleExecutor.callOnModuleDestroy(reverse)
    └── LifecycleExecutor.callOnApplicationShutdown(reverse)
```
