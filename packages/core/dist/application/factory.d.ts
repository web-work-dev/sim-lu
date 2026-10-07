import "@sim-lu/common";
import type { DynamicModule } from "@sim-lu/common";
import type { HttpAdapter } from "../adapter/http-adapter.js";
import type { CreateApplicationOptions } from "../adapter/plugin.js";
import { ApplicationContext } from "./application-context.js";
declare const ADAPTER_REQUIRED_MESSAGE = "HTTP adapter is required. Choose ExpressAdapter from @sim-lu/platform-express or UwsAdapter from @sim-lu/platform-uws.";
export declare function createApplication(rootModule: Function | DynamicModule, adapter: HttpAdapter, options?: CreateApplicationOptions): Promise<ApplicationContext>;
export { ADAPTER_REQUIRED_MESSAGE };
//# sourceMappingURL=factory.d.ts.map