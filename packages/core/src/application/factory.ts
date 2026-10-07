import "@sim-lu/common";
import type { DynamicModule } from "@sim-lu/common";

import type { HttpAdapter } from "../adapter/http-adapter.js";
import type { CreateApplicationOptions } from "../adapter/plugin.js";
import { ApplicationContext } from "./application-context.js";

const ADAPTER_REQUIRED_MESSAGE =
    "HTTP adapter is required. Choose ExpressAdapter from @sim-lu/platform-express or UwsAdapter from @sim-lu/platform-uws.";

export async function createApplication(
    rootModule: Function | DynamicModule,
    adapter: HttpAdapter,
    options?: CreateApplicationOptions,
): Promise<ApplicationContext> {
    if (adapter == null) {
        throw new Error(ADAPTER_REQUIRED_MESSAGE);
    }

    return ApplicationContext.create(rootModule, adapter, options);
}

export { ADAPTER_REQUIRED_MESSAGE };
