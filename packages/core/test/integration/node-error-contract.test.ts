import { describe, beforeAll, afterAll } from "vitest";

import {
    Controller,
    Get,
    Module,
    createApplication,
    type ApplicationContext,
} from "@sim-lu/core";
import {
    BadRequestException,
    NotFoundException,
    ConflictException,
    ok,
    type SuccessResponse,
} from "@sim-lu/error";
import { NodeHttpKernel } from "@sim-lu/core";
import {
    MemoryLogTarget,
    type ErrorHandlerOptions,
    type LogEntry,
} from "@sim-lu/error";
import { describeHttpErrorContract } from "../../../../test/helpers/http-error-contract.js";

@Controller("contract")
class ContractController {
    @Get("/get")
    public get(): SuccessResponse<{ method: string }> {
        return ok({ method: "GET" });
    }

    @Get("/bad-request")
    public badRequest(): never {
        throw new BadRequestException("invalid payload", { details: { field: "name" } });
    }

    @Get("/not-found")
    public notFound(): never {
        throw new NotFoundException("resource not found");
    }

    @Get("/conflict")
    public conflict(): never {
        throw new ConflictException("resource exists");
    }

    @Get("/generic")
    public generic(): never {
        throw new Error("unexpected crash");
    }
}

@Module({
    controllers: [ContractController],
})
class ContractModule {}

class NodeTestAdapter extends NodeHttpKernel {
    public readonly name = "node";

    public constructor(options?: ErrorHandlerOptions) {
        super("node", options);
    }
}

describe("Node fallback HTTP error contract", () => {
    let app: ApplicationContext;
    let adapter: NodeTestAdapter;
    let port: number;
    let memoryLog: MemoryLogTarget<LogEntry>;

    beforeAll(async () => {
        memoryLog = new MemoryLogTarget<LogEntry>();
        adapter = new NodeTestAdapter({ console: false, targets: [memoryLog] });
        app = await createApplication(ContractModule, adapter);
        await app.listen({ port: 0, host: "127.0.0.1" });
        port = adapter.getPort() as number;
    });

    afterAll(async () => {
        await app.close();
    });

    describeHttpErrorContract("node", () => ({ port, memoryLog }));
});
