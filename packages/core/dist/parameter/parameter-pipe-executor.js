import { PipeRegistry } from "../pipe/pipe-registry.js";
export class ParameterPipeExecutor {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    async execute(args, pipes, context) {
        const result = [...args];
        for (const metadata of pipes) {
            const pipe = await this.resolvePipe(metadata.pipe);
            result[metadata.index] =
                await pipe.transform(result[metadata.index], context);
        }
        return result;
    }
    async resolvePipe(token) {
        if (!this.registry.has(token)) {
            await this.registry.register(token);
        }
        return this.registry.get(token);
    }
}
//# sourceMappingURL=parameter-pipe-executor.js.map