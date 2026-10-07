export interface Todo extends Record<string, unknown> {
    readonly id: string;
    readonly title: string;
    readonly completed: boolean;
}

export interface CreateTodoDto extends Record<string, unknown> {
    readonly title: string;
    readonly completed?: boolean;
}

export interface UpdateTodoDto extends Record<string, unknown> {
    readonly title?: string;
    readonly completed?: boolean;
}
