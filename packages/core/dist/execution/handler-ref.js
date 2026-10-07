export class HandlerRef {
    controller;
    method;
    constructor(controller, method) {
        this.controller = controller;
        this.method = method;
    }
    invoke(args = []) {
        const handler = this.controller.instance[this.method];
        if (typeof handler !== "function") {
            throw new Error(`Handler "${String(this.method)}" is not a function`);
        }
        return handler.apply(this.controller.instance, args);
    }
}
//# sourceMappingURL=handler-ref.js.map