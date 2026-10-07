import { Module } from "@sim-lu/core";

import { DatabaseService } from "@sim-lu/database";

import { ApiController } from "./controllers/api.controller.js";
import { GreetService } from "./services/greet.service.js";

@Module({
    controllers: [ApiController],
    providers: [GreetService, DatabaseService],
})
export class AppModule {}
