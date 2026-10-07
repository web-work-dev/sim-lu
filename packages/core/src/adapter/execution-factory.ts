import { Container } from "../container/container.js";
import type { ExceptionFilter } from "../exception-filter/exception-filter.js";
import { ExceptionFilterExecutor } from "../exception-filter/exception-filter-executor.js";
import { ExceptionFilterMetadata } from "../exception-filter/exception-filter-metadata.js";
import { ExceptionFilterRegistry } from "../exception-filter/exception-filter-registry.js";
import { ExecutionDispatcher } from "../execution/execution-dispatcher.js";
import { ExecutionEngine } from "../execution/execution-engine.js";
import { ExecutionPipeline } from "../execution/execution-pipeline.js";
import { ExecutionRunner } from "../execution/execution-runner.js";
import { GuardExecutor } from "../guard/guard-executor.js";
import { GuardMetadata } from "../guard/guard-metadata.js";
import { GuardRegistry } from "../guard/guard-registry.js";
import { InterceptorExecutor } from "../interceptor/interceptor-executor.js";
import { InterceptorMetadata } from "../interceptor/interceptor-metadata.js";
import { InterceptorRegistry } from "../interceptor/interceptor-registry.js";
import { ParameterMetadataResolver } from "../parameter/parameter-metadata.js";
import { ParameterPipeExecutor } from "../parameter/parameter-pipe-executor.js";
import { ParameterResolver } from "../parameter/parameter-resolver.js";
import { PipeExecutor } from "../pipe/pipe-executor.js";
import { PipeMetadata } from "../pipe/pipe-metadata.js";
import { PipeRegistry } from "../pipe/pipe-registry.js";
import { TransformerExecutor } from "../transform/transformer-executor.js";
import { TransformerMetadata } from "../transform/transformer-metadata.js";
import { TransformerRegistry } from "../transform/transformer-registry.js";

export interface ExecutionFactoryOptions {
    readonly filters?: readonly Function[];
    readonly guards?: readonly Function[];
    readonly interceptors?: readonly Function[];
    readonly transformers?: readonly Function[];
    readonly fallbackFilter?: ExceptionFilter;
}

export function createExecutionDispatcher(
    container: Container,
    options: ExecutionFactoryOptions = {},
): ExecutionDispatcher {
    const pipeline = new ExecutionPipeline();
    const parameterResolver = new ParameterResolver(
        new ParameterMetadataResolver(),
    );
    const pipeExecutor = new ParameterPipeExecutor(
        new PipeRegistry(container),
    );
    const runner = new ExecutionRunner(
        parameterResolver,
        pipeExecutor,
    );
    const engine = new ExecutionEngine(
        new TransformerExecutor(
            new TransformerMetadata(options.transformers ?? []),
            new TransformerRegistry(container),
        ),
        new ExceptionFilterExecutor(
            new ExceptionFilterMetadata(options.filters ?? []),
            new ExceptionFilterRegistry(container),
            options.fallbackFilter,
        ),
        new InterceptorExecutor(
            new InterceptorMetadata(options.interceptors ?? []),
            new InterceptorRegistry(container),
        ),
        new GuardExecutor(
            new GuardMetadata(options.guards ?? []),
            new GuardRegistry(container),
        ),
        runner,
        new PipeExecutor(
            new PipeMetadata(),
            new PipeRegistry(container),
        ),
    );

    return new ExecutionDispatcher(pipeline, engine);
}
