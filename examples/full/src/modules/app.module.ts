import { Module } from "@sim-lu/core";

import { HealthController } from "../controllers/health.controller.js";
import { TodosController } from "../controllers/todos.controller.js";
import { SecureTodosController } from "../controllers/secure-todos.controller.js";
import { ChatGateway } from "../gateways/chat.gateway.js";
import { HealthService } from "../services/health.service.js";
import { TodosService } from "../services/todos.service.js";

@Module({
    controllers: [HealthController, ChatGateway, TodosController, SecureTodosController],
    providers: [HealthService, TodosService],
})
export class AppModule {}