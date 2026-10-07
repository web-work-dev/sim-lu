import { Container } from "../container/container.js";
import type { ExceptionFilter } from "../exception-filter/exception-filter.js";
import { ExecutionDispatcher } from "../execution/execution-dispatcher.js";
export interface ExecutionFactoryOptions {
    readonly filters?: readonly Function[];
    readonly guards?: readonly Function[];
    readonly interceptors?: readonly Function[];
    readonly transformers?: readonly Function[];
    readonly fallbackFilter?: ExceptionFilter;
}
export declare function createExecutionDispatcher(container: Container, options?: ExecutionFactoryOptions): ExecutionDispatcher;
//# sourceMappingURL=execution-factory.d.ts.map