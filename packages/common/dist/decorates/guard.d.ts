/**
 * Registers guards that run before a handler is invoked.
 *
 * Can be applied at the class level (applies to all routes) or the method level.
 *
 * @param guards - Guardian classes to execute.
 */
export declare function UseGuards(...guards: readonly Function[]): ClassDecorator & MethodDecorator;
//# sourceMappingURL=guard.d.ts.map