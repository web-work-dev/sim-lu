import {
    Controller,
    Delete,
    Get,
    Post,
    Put,
    UseGuards,
    Param,
    Body,
} from "@sim-lu/core";
import {
    created,
    noContent,
    ok,
    NotFoundException,
} from "@sim-lu/error";

import { type Todo, type CreateTodoDto, type UpdateTodoDto } from "../models/todo.model.js";
import { TodosService } from "../services/todos.service.js";
import { ApiKeyGuard } from "../guards/api-key.guard.js";

@Controller("secure/todos")
@UseGuards(ApiKeyGuard)
export class SecureTodosController {
    public constructor(
        private readonly todosService: TodosService,
    ) {}

    @Get()
    public async list(): Promise<Todo[]> {
        return this.todosService.list();
    }

    @Get("/:id")
    public async find(
        @Param("id") id: string,
    ): Promise<Todo> {
        const todo = await this.todosService.find(id);

        if (!todo) {
            throw new NotFoundException(`Todo with id "${id}" not found`);
        }

        return todo;
    }

    @Post()
    public async create(
        @Body() body: CreateTodoDto,
    ): Promise<unknown> {
        return created(await this.todosService.create(body));
    }

    @Put("/:id")
    public async update(
        @Param("id") id: string,
        @Body() body: UpdateTodoDto,
    ): Promise<unknown> {
        const todo = await this.todosService.update(id, body);

        if (!todo) {
            throw new NotFoundException(`Todo with id "${id}" not found`);
        }

        return ok(todo);
    }

    @Delete("/:id")
    public async remove(
        @Param("id") id: string,
    ): Promise<unknown> {
        const deleted = await this.todosService.remove(id);

        if (!deleted) {
            throw new NotFoundException(`Todo with id "${id}" not found`);
        }

        return noContent();
    }
}
