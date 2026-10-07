import {
    Body,
    Controller,
    Get,
    Module,
    Param,
    Post,
    Query,
    createApplication,
} from "@sim-lu/core";
import { ok, created, fail, type SuccessResponse, type FailureResponse } from "@sim-lu/error";
import { DatabaseService, DatabasePlugin } from "@sim-lu/database";
import { ExpressAdapter } from "@sim-lu/platform-express";

type UserData = Record<string, unknown> & {
    id: string;
    name: string;
};

@Controller("hello")
class HelloController {
    public constructor(
        private readonly db: DatabaseService,
    ) {}

    @Get()
    public hello(
        @Query("name") name: string = "World",
    ) {
        return ok({ message: `Hello from Express, ${name}!` });
    }

    @Get("/:name")
    public helloName(
        @Param("name") name: string,
    ) {
        return ok({ message: `Hello, ${name}!` });
    }

    @Post()
    public create(
        @Body() body: { name: string },
    ) {
        return created({ id: 1, name: body.name });
    }
}

@Controller("users")
class UsersController {
    public constructor(
        private readonly db: DatabaseService,
    ) {}

    @Get()
    public async list() {
        const result = await this.db.find<UserData>("users");
        return ok(result);
    }

    @Post()
    public async create(
        @Body() body: { name: string },
    ) {
        const user = await this.db.insert<UserData>("users", {
            id: crypto.randomUUID(),
            name: body.name,
        });
        return created(user);
    }

    @Get("/:id")
    public async find(
        @Param("id") id: string,
    ): Promise<SuccessResponse<UserData> | FailureResponse> {
        const user = await this.db.findOne<UserData>("users", { id });

        if (!user) {
            return fail(404, `User ${id} not found`);
        }

        return ok(user);
    }
}

@Controller("error")
class ErrorController {
    @Get("/bad-request")
    public bad() {
        return fail(400, "This is a bad request");
    }

    @Get("/not-found")
    public notFound() {
        throw new Error("Something went wrong!");
    }
}

@Module({
    controllers: [HelloController, UsersController, ErrorController],
})
class AppModule {}

async function main() {
    const adapter = new ExpressAdapter({
        error: {
            console: true,
            file: "./logs/express-minimal.log",
            service: "express-minimal",
            targets: [],
        },
    });

    const app = await createApplication(AppModule, adapter, {
        plugins: [DatabasePlugin.forRoot({})],
    });
    await app.listen({ port: 3000, host: "127.0.0.1" });
    console.log("Express server listening on http://127.0.0.1:3000");
    console.log("Endpoints:");
    console.log("  GET  /hello?name=World  - Greeting with query param");
    console.log("  GET  /hello/:name       - Greeting with route param");
    console.log("  POST /hello             - Echo POST body");
    console.log("  GET  /users             - List users (in-memory DB)");
    console.log("  POST /users             - Create user");
    console.log("  GET  /users/:id         - Get user by id");
    console.log("  GET  /error/bad-request - 400 error");
    console.log("  GET  /error/not-found   - 500 error");

    process.on("SIGINT", async () => {
        await app.close();
        process.exit(0);
    });
}

void main();
