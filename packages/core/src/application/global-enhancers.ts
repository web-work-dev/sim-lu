export class GlobalEnhancers {
    public readonly filters: Function[] = [];
    public readonly guards: Function[] = [];
    public readonly interceptors: Function[] = [];
    public readonly transformers: Function[] = [];
    public readonly pipes: Function[] = [];

    public addFilters(
        filters: readonly Function[],
    ): void {
        this.filters.push(...filters);
    }

    public addGuards(
        guards: readonly Function[],
    ): void {
        this.guards.push(...guards);
    }

    public addInterceptors(
        interceptors: readonly Function[],
    ): void {
        this.interceptors.push(...interceptors);
    }

    public addTransformers(
        transformers: readonly Function[],
    ): void {
        this.transformers.push(...transformers);
    }

    public addPipes(
        pipes: readonly Function[],
    ): void {
        this.pipes.push(...pipes);
    }
}
