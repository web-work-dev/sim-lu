/**
 * Registers exception filters to catch errors thrown by handlers.
 *
 * Can be applied at the class level or the method level.
 *
 * @param filters - Exception filter classes to apply.
 */
export declare function UseFilters(...filters: readonly Function[]): ClassDecorator & MethodDecorator;
/**
 * Marks a class as an exception filter that only catches the specified
 * exception types.
 *
 * @param types - Exception classes (or tokens) to catch.
 */
export declare function Catch(...types: readonly Function[]): ClassDecorator;
//# sourceMappingURL=exception-filter.d.ts.map