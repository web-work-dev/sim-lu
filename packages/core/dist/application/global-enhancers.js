export class GlobalEnhancers {
    filters = [];
    guards = [];
    interceptors = [];
    transformers = [];
    pipes = [];
    addFilters(filters) {
        this.filters.push(...filters);
    }
    addGuards(guards) {
        this.guards.push(...guards);
    }
    addInterceptors(interceptors) {
        this.interceptors.push(...interceptors);
    }
    addTransformers(transformers) {
        this.transformers.push(...transformers);
    }
    addPipes(pipes) {
        this.pipes.push(...pipes);
    }
}
//# sourceMappingURL=global-enhancers.js.map