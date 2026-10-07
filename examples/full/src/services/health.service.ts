import { Injectable, type OnModuleInit } from "@sim-lu/core";

import { type Todo } from "../models/todo.model.js";

@Injectable({ scope: "singleton" })
export class HealthService
    implements OnModuleInit {
    private readonly startTime = Date.now();

    public onModuleInit(): void {
        console.log("HealthService: module initialized");
    }

    public health(): { readonly status: string } {
        return { status: "ok" };
    }

    public uptime(): { readonly uptime: number } {
        return { uptime: Date.now() - this.startTime };
    }
}
