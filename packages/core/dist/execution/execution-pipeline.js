export class ExecutionPipeline {
    middleware = [];
    use(middleware) {
        this.middleware.push(middleware);
        return this;
    }
    async execute(context, handler) {
        const chain = this.middleware.reduceRight((next, middleware) => {
            return (currentContext) => middleware(currentContext, next);
        }, handler);
        return chain(context);
    }
}
//# sourceMappingURL=execution-pipeline.js.map