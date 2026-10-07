import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@sim-lu/core";

import { DatabaseService } from "@sim-lu/database";

import { type Todo, type CreateTodoDto, type UpdateTodoDto } from "../models/todo.model.js";

@Injectable({ scope: "singleton" })
export class TodosService
    implements OnModuleInit, OnModuleDestroy {
    public constructor(
        private readonly db: DatabaseService,
    ) {}

    public onModuleInit(): void {
        console.log("TodosService: module initialized");
    }

    public onModuleDestroy(): void {
        console.log("TodosService: module destroyed");
    }

    public async list(): Promise<Todo[]> {
        return this.db.find<Todo>("todos");
    }

    public async find(id: string): Promise<Todo | undefined> {
        return this.db.findOne<Todo>("todos", { id });
    }

    public async create(dto: CreateTodoDto): Promise<Todo> {
        const all = await this.db.find<Todo>("todos");
        const todo: Todo = {
            id: String(all.length + 1),
            title: dto.title,
            completed: dto.completed ?? false,
        };

        return this.db.insert<Todo>("todos", todo);
    }

    public async update(id: string, dto: UpdateTodoDto): Promise<Todo | undefined> {
        const existing = await this.find(id);

        if (!existing) {
            return undefined;
        }

        const data: Record<string, unknown> = { id };
        if (dto.title !== undefined) {
            data.title = dto.title;
        }
        if (dto.completed !== undefined) {
            data.completed = dto.completed;
        }

        await this.db.update<Todo>("todos", { id }, data);

        const updated = await this.find(id);
        return updated ?? undefined;
    }

    public async remove(id: string): Promise<boolean> {
        const deleted = await this.db.remove("todos", { id });
        return deleted > 0;
    }
}
