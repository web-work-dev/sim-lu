import "@sim-lu/common";
import { ApplicationContext } from "./application-context.js";
const ADAPTER_REQUIRED_MESSAGE = "HTTP adapter is required. Choose ExpressAdapter from @sim-lu/platform-express or UwsAdapter from @sim-lu/platform-uws.";
export async function createApplication(rootModule, adapter, options) {
    if (adapter == null) {
        throw new Error(ADAPTER_REQUIRED_MESSAGE);
    }
    return ApplicationContext.create(rootModule, adapter, options);
}
export { ADAPTER_REQUIRED_MESSAGE };
//# sourceMappingURL=factory.js.map