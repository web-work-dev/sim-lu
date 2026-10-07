/**
 * Lifecycle hook called after a module's providers have been instantiated
 * and its dependencies have been resolved, but before it starts handling requests.
 */
export interface OnModuleInit {
    onModuleInit(): void | Promise<void>;
}

/**
 * Lifecycle hook called after all modules have been initialized and the
 * application is ready to accept requests.
 */
export interface OnApplicationBootstrap {
    onApplicationBootstrap(): void | Promise<void>;
}

/**
 * Lifecycle hook called when the application is shutting down.
 * Use this to release resources such as database connections.
 */
export interface OnModuleDestroy {
    onModuleDestroy(): void | Promise<void>;
}

/**
 * Lifecycle hook called before the application process receives a
 * termination signal (e.g. `SIGTERM`, `SIGINT`).
 *
 * @param signal - The signal name, if available.
 */
export interface BeforeApplicationShutdown {
    beforeApplicationShutdown(signal?: string): void | Promise<void>;
}

/**
 * Lifecycle hook called during the application shutdown sequence.
 *
 * @param signal - The signal name, if available.
 */
export interface OnApplicationShutdown {
    onApplicationShutdown(signal?: string): void | Promise<void>;
}
