/**
 * Registers interceptors that wrap a handler invocation.
 *
 * Can be applied at the class level or the method level.
 *
 * @param interceptors - Interceptor classes to execute.
 */
export declare function UseInterceptors(...interceptors: readonly Function[]): ClassDecorator & MethodDecorator;
//# sourceMappingURL=interceptor.d.ts.map