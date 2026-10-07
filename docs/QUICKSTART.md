# Quick Start Guide

This guide walks you through creating a basic `@sim-lu` framework application with HTTP routing, dependency injection, and middleware components.

---

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

---

## 1. Create a New Project

```bash
mkdir my-app && cd my-app
pnpm init -y
```

## 2. Install Dependencies

```bash
pnpm add @sim-lu/core @sim-lu/common @sim-lu/http @sim-lu/error
# Choose one platform adapter:
pnpm add @sim-lu/platform-express express
# OR
pnpm add @sim-lu/platform-uws uWebSockets.js
```

Add `reflect-metadata` as a dev dependency:

```bash
pnpm add -D reflect-metadata
```

---

## 3. Create the Root Module

```typescript
// src/app.module.ts
import { Module } from "@sim-lu/core";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";

@Module({
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
```

## 4. Create a Controller

```typescript
// src/app.controller.ts
import { Controller, Get, Param, Query } from "@sim-lu/core";
import type { HttpResponse } from "@sim-lu/http";
import { ok, created, noContent } from "@sim-lu/error";
import type { AppService } from "./app.service.js";

@Controller("api")
export class AppController {
    constructor(private readonly service: AppService) {}

    @Get()
    public index(): HttpResponse {
        return {
            statusCode: 200,
            body: ok({ message: "Hello, World!" }),
        };
    }

    @Get("users/:id")
    public getUser(
        @Param("id") id: string,
    ) {
        const user = this.service.findUser(id);
        if (user) {
            return ok(user);
        }
        return fail(404, `User ${id} not found`);
    }
}
```

## 5. Create a Service

```typescript
// src/app.service.ts
import { Injectable } from "@sim-lu/core";

@Injectable()
export class AppService {
    public findUser(id: string): { id: string; name: string } | undefined {
        return { id, name: `User ${id}` };
    }
}
```

## 6. Bootstrap the Application

```typescript
// src/index.ts
import "@sim-lu/common";
import "reflect-metadata";

import { createApplication } from "@sim-lu/core";
import { ExpressAdapter } from "@sim-lu/platform-express";
import { AppModule } from "./app.module.js";

async function main() {
    const app = await createApplication(AppModule, new ExpressAdapter());
    await app.listen({ port: 3000 });
    console.log("Server running on http://127.0.0.1:3000");
}

main().catch(console.error);
```

## 7. Build and Run

```bash
npx tsx src/index.ts
```

Visit `http://127.0.0.1:3000/api` to see the response.

---

## Using uWebSockets.js

For better performance, use the uWS adapter:

```bash
pnpm add @sim-lu/platform-uws uWebSockets.js
```

```typescript
import { UwsAdapter } from "@sim-lu/platform-uws";

const app = await createApplication(AppModule, new UwsAdapter());
await app.listen({ port: 3000 });
```

---

## Next Steps

- [Decorators Guide](./decorators.md)
- [Execution Pipeline Guide](./execution-pipeline.md)
- [Error Handling Guide](./error-handling.md)
- [WebSockets Guide](./websockets.md)
