var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Inject, Injectable, } from "@sim-lu/core";
import { DATABASE, DATABASE_OPTIONS } from "./tokens.js";
let DatabaseService = class DatabaseService {
    adapter;
    options;
    constructor(adapter, options) {
        this.adapter = adapter;
        this.options = options;
    }
    getAdapter() {
        return this.adapter;
    }
    getOptions() {
        return this.options;
    }
    isConnected() {
        return this.adapter.isConnected();
    }
    connect() {
        return this.adapter.connect();
    }
    disconnect() {
        return this.adapter.disconnect();
    }
    async onModuleInit() {
        if (this.options.autoConnect === false) {
            return;
        }
        if (!this.adapter.isConnected()) {
            await this.adapter.connect();
        }
    }
    async onModuleDestroy() {
        if (this.adapter.isConnected()) {
            await this.adapter.disconnect();
        }
    }
    query(sql, params) {
        return this.adapter.query(sql, params);
    }
    execute(sql, params) {
        return this.adapter.execute(sql, params);
    }
    transaction(work) {
        return this.adapter.transaction(work);
    }
    insert(table, data) {
        return this.operations().insert(table, data);
    }
    find(table, where) {
        return this.operations().find(table, where);
    }
    findOne(table, where) {
        return this.operations().findOne(table, where);
    }
    update(table, where, data) {
        return this.operations().update(table, where, data);
    }
    remove(table, where) {
        return this.operations().remove(table, where);
    }
    operations() {
        if (this.isOperations(this.adapter)) {
            return this.adapter;
        }
        throw new Error(`Database adapter "${this.adapter.name}" does not support high-level table operations`);
    }
    isOperations(adapter) {
        const candidate = adapter;
        return typeof candidate.insert === "function"
            && typeof candidate.find === "function";
    }
};
DatabaseService = __decorate([
    Injectable(),
    __param(0, Inject(DATABASE)),
    __param(1, Inject(DATABASE_OPTIONS)),
    __metadata("design:paramtypes", [Object, Object])
], DatabaseService);
export { DatabaseService };
//# sourceMappingURL=database.service.js.map