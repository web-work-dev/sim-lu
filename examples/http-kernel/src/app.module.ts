import {
    Body,
    Controller,
    Get,
    Module,
    Param,
    Post,
    Query,
} from "@sim-lu/core";
import {
    ok,
    created,
    fail,
} from "@sim-lu/error";
import {
    DatabaseService,
    DatabasePlugin,
    MemoryDatabaseAdapter,
} from "@sim-lu/database";

export type Book = Record<string, unknown> & {
    id: string;
    title: string;
    author: string;
};

@Controller("api")
class ApiController {
    public constructor(
        private readonly db: DatabaseService,
    ) {}

    @Get("/status")
    public status() {
        return ok({ status: "running", uptime: process.uptime() });
    }

    @Get("/echo/:message")
    public echo(
        @Param("message") message: string,
        @Query("repeat") repeat: string = "1",
    ) {
        const count = Number.parseInt(repeat, 10) || 1;
        const text = Array(count).fill(message).join("-");
        return ok({ echoed: text, repeat: count });
    }

    @Post("/calculate")
    public calculate(
        @Body() body: { a: number; b: number; op: "+" | "-" | "*" | "/" },
    ) {
        const { a, b, op } = body;

        if (typeof a !== "number" || typeof b !== "number") {
            return fail(400, "a and b must be numbers");
        }

        let result: number;

        switch (op) {
            case "+": result = a + b; break;
            case "-": result = a - b; break;
            case "*": result = a * b; break;
            case "/": result = b === 0 ? NaN : a / b; break;
            default:
                return fail(400, "Invalid operation");
        }

        return ok({ result });
    }

    @Get("/books")
    public async listBooks() {
        const books = await this.db.find<Book>("books");
        return ok(books);
    }

    @Post("/books")
    public async createBook(
        @Body() body: { title: string; author: string },
    ) {
        const book = await this.db.insert<Book>("books", {
            id: crypto.randomUUID(),
            title: body.title,
            author: body.author,
        });
        return created(book);
    }

    @Get("/error")
    public error() {
        throw new Error("Something went wrong!");
    }
}

@Module({
    controllers: [ApiController],
})
export class AppModule {}
