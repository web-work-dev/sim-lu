import {
    Inject,
    Injectable,
    type OnModuleDestroy,
    type OnModuleInit,
} from "@sim-lu/core";

import type {
    DatabaseAdapter,
    DatabaseOperations,
    QueryResult,
    SqlValue,
    TransactionHandle,
} from "./adapter/database-adapter.js";
import { DATABASE, DATABASE_OPTIONS } from "./tokens.js";
import type { DatabaseModuleOptions } from "./config/options.js";

@Injectable()
export class DatabaseService
    implements OnModuleInit, OnModuleDestroy, DatabaseOperations {
    public constructor(
        @Inject(DATABASE)
        private readonly adapter: DatabaseAdapter,
        @Inject(DATABASE_OPTIONS)
        private readonly options: DatabaseModuleOptions,
    ) { }

    public getAdapter(): DatabaseAdapter {
        return this.adapter;
    }

    public getOptions(): DatabaseModuleOptions {
        return this.options;
    }

    public isConnected(): boolean {
        return this.adapter.isConnected();
    }

    public connect(): Promise<void> {
        return this.adapter.connect();
    }

    public disconnect(): Promise<void> {
        return this.adapter.disconnect();
    }

    public async onModuleInit(): Promise<void> {
        if (this.options.autoConnect === false) {
            return;
        }

        if (!this.adapter.isConnected()) {
            await this.adapter.connect();
        }
    }

    public async onModuleDestroy(): Promise<void> {
        if (this.adapter.isConnected()) {
            await this.adapter.disconnect();
        }
    }

    public query<T = Record<string, unknown>>(
        sql: string,
        params?: readonly SqlValue[],
    ): Promise<QueryResult<T>> {
        return this.adapter.query<T>(sql, params);
    }

    public execute(
        sql: string,
        params?: readonly SqlValue[],
    ): Promise<number> {
        return this.adapter.execute(sql, params);
    }

    public transaction<T>(
        work: (tx: TransactionHandle) => Promise<T>,
    ): Promise<T> {
        return this.adapter.transaction(work);
    }

    public insert<T extends Record<string, unknown>>(
        table: string,
        data: T,
    ): Promise<T> {
        return this.operations().insert(table, data);
    }

    public find<T extends Record<string, unknown>>(
        table: string,
        where?: Partial<T>,
    ): Promise<T[]> {
        return this.operations().find(table, where);
    }

    public findOne<T extends Record<string, unknown>>(
        table: string,
        where: Partial<T>,
    ): Promise<T | undefined> {
        return this.operations().findOne(table, where);
    }

    public update<T extends Record<string, unknown>>(
        table: string,
        where: Partial<T>,
        data: Partial<T>,
    ): Promise<number> {
        return this.operations().update(table, where, data);
    }

    public remove<T extends Record<string, unknown>>(
        table: string,
        where: Partial<T>,
    ): Promise<number> {
        return this.operations().remove(table, where);
    }

    private operations(): DatabaseOperations {
        if (this.isOperations(this.adapter)) {
            return this.adapter;
        }

        throw new Error(
            `Database adapter "${this.adapter.name}" does not support high-level table operations`,
        );
    }

    private isOperations(
        adapter: DatabaseAdapter,
    ): adapter is DatabaseAdapter & DatabaseOperations {
        const candidate = adapter as unknown as Partial<DatabaseOperations>;
        return typeof candidate.insert === "function"
            && typeof candidate.find === "function";
    }
}
