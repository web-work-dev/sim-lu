/**
 * Marks a module as globally available, allowing its providers to be
 * resolved from any module in the application.
 */
export declare function Global(): ClassDecorator;
/**
 * Checks whether a module is marked as global.
 *
 * @param target - The module class to check.
 */
export declare function isGlobalModule(target: Function): boolean;
//# sourceMappingURL=global.d.ts.map