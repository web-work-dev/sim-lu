import { type CompiledModules } from "./module-compiler.js";
import { ModuleWrapper } from "./module-wrapper.js";
export declare class ContainerComposer {
    compose(compiled: CompiledModules): Promise<ModuleWrapper[]>;
    private visit;
    private registerModule;
    private registerInternalProviders;
    private registerDecoratorProviders;
    private collectDecoratorProviders;
    private collectClassEnhancers;
    private addFunctionTokens;
    private registerProvider;
    private bindImports;
    private bindGlobals;
    private collectExports;
    private findExportedInstance;
    private instantiate;
    private instantiateProvider;
    private instantiateCustomProvider;
    private instantiateToken;
    private construct;
    private resolveDependency;
    private getConstructorDependencies;
    private canResolve;
    private collectKnownTokens;
    private findLocalProvider;
    private isLocalToken;
    private getName;
}
//# sourceMappingURL=container-composer.d.ts.map