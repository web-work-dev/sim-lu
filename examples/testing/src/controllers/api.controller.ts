import { Body, Controller, Get, Headers, Param, Post, Query } from "@sim-lu/core";
import { ok, created, fail } from "@sim-lu/error";

import { DatabaseService } from "@sim-lu/database";

import { GreetService } from "../services/greet.service.js";

export interface Item extends Record<string, unknown> {
    id: string;
    name: string;
    quantity: number;
}

@Controller("api")
export class ApiController {
    public constructor(
        private readonly greetService: GreetService,
        private readonly db: DatabaseService,
    ) {}

    @Get("/hello")
    public hello(
        @Query("name") name: string = "World",
        @Headers("x-session-id") sessionId?: string,
    ) {
        return ok(this.greetService.greet(name, sessionId));
    }

    @Get("/hello/:name")
    public helloNamed(
        @Param("name") name: string,
    ) {
        return ok({ message: `Hello, ${name}!`, length: name.length });
    }

    @Post("/echo")
    public echo(
        @Body() body: Record<string, unknown>,
    ) {
        return created(body);
    }

    @Get("/items")
    public async listItems() {
        const items = await this.db.find<Item>("items");
        return ok(items);
    }

    @Get("/items/:id")
    public async findItem(
        @Param("id") id: string,
    ) {
        const item = await this.db.findOne<Item>("items", { id });

        if (!item) {
            return fail(404, `Item ${id} not found`);
        }

        return ok(item);
    }

    @Post("/items")
    public async createItem(
        @Body() body: { name: string; quantity: number },
    ) {
        const item = await this.db.insert<Item>("items", {
            id: crypto.randomUUID(),
            name: body.name,
            quantity: body.quantity,
        });
        return created(item);
    }
}
