import { Controller, Get } from "@sim-lu/core";
import { ok } from "@sim-lu/error";

import { HealthService } from "../services/health.service.js";

@Controller("health")
export class HealthController {
    public constructor(
        private readonly healthService: HealthService,
    ) {}

    @Get()
    public check(): unknown {
        return ok(this.healthService.health());
    }

    @Get("/uptime")
    public uptime(): unknown {
        return ok(this.healthService.uptime());
    }
}
