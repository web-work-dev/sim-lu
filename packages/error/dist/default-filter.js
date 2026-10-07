import { ErrorHandler } from "./handler.js";
import {} from "./handler.js";
import { snapshotRequest } from "./adapter.js";
export class DefaultExceptionFilter {
    handler;
    includeDetails;
    constructor(options = {}) {
        if (options instanceof ErrorHandler) {
            this.handler = options;
            this.includeDetails = true;
        }
        else {
            this.handler = new ErrorHandler({
                console: options.console ?? false,
                ...options,
            });
            this.includeDetails = options.includeDetails ?? true;
        }
    }
    getHandler() {
        return this.handler;
    }
    catch(exception, context) {
        const request = this.snapshot(context);
        return this.handler.handle(exception, request);
    }
    snapshot(context) {
        const request = context?.get("request");
        if (!request) {
            return undefined;
        }
        return snapshotRequest(request);
    }
}
export function createDefaultExceptionFilter(options = {}) {
    return new DefaultExceptionFilter(options);
}
//# sourceMappingURL=default-filter.js.map