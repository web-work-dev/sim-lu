import {
    Body,
    Controller,
    Get,
    Module,
    OnMessage,
    Param,
    Post,
    Query,
    WebSocket,
    createApplication,
} from "@sim-lu/core";
import { ok, created, fail, HttpStatus } from "@sim-lu/error";
import { DatabaseService, DatabasePlugin } from "@sim-lu/database";
import { UwsAdapter } from "@sim-lu/platform-uws";

type UserData = Record<string, unknown> & {
    id: string;
    name: string;
};

@Controller("hello")
class HelloController {
    @Get()
    public hello(
        @Query("name") name: string = "World",
    ) {
        return ok({ message: `Hello from uWebSockets.js, ${name}!` });
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
    ) {
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
        return fail(HttpStatus.BAD_REQUEST, "This is a bad request");
    }

    @Get("/not-found")
    public notFound() {
        throw new Error("Something went wrong!");
    }
}

@WebSocket("/live")
class LiveGateway {
    @OnMessage()
    public onMessage() {
        return ok({ message: "Welcome to the live feed!" });
    }
}

@Module({
    controllers: [HelloController, UsersController, ErrorController, LiveGateway],
})
class AppModule {}

async function main() {
    const adapter = new UwsAdapter({
        error: {
            console: true,
            file: "./logs/uws-minimal.log",
            service: "uws-minimal",
            targets: [],
        },
    });

    const app = await createApplication(AppModule, adapter, {
        plugins: [DatabasePlugin.forRoot({})],
    });
    await app.listen({ port: 3000, host: "127.0.0.1" });
    console.log("uWebSockets.js server listening on http://127.0.0.1:3000");

    process.on("SIGINT", async () => {
        await app.close();
        process.exit(0);
    });
}

void main();
