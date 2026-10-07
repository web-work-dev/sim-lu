import {
    Controller,
    Get,
    Injectable,
    Module,
    type OnModuleInit,
} from "@sim-lu/core";
import { ok, type SuccessResponse } from "@sim-lu/error";
import { DatabaseService } from "@sim-lu/database";
import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    API_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

@Injectable({ scope: "singleton" })
export class ConfigService implements OnModuleInit {
    private config!: AppConfig;

    public onModuleInit(): void {
        this.config = envSchema.parse(process.env);
    }

    public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
        return this.config[key];
    }

    public getAll(): AppConfig {
        return this.config;
    }

    public isProduction(): boolean {
        return this.config.NODE_ENV === "production";
    }
}

@Controller("config")
export class ConfigController {
    public constructor(
        private readonly configService: ConfigService,
        private readonly db: DatabaseService,
    ) {}

    @Get("/database")
    public database(): SuccessResponse<{ url: string }> {
        const url = this.configService.get("DATABASE_URL");
        return ok({
            url: url.replace(/:\/\/.*@/, "://***:***@"),
        });
    }

    @Get("/environment")
    public environment(): SuccessResponse<{ env: string; isProduction: boolean }> {
        return ok({
            env: this.configService.get("NODE_ENV"),
            isProduction: this.configService.isProduction(),
        });
    }

    @Get("/db/status")
    public async dbStatus(): Promise<SuccessResponse<{ connected: boolean }>> {
        return ok({ connected: this.db.isConnected() });
    }
}

@Module({
    controllers: [ConfigController],
    providers: [ConfigService, DatabaseService],
})
export class AppModule {}
