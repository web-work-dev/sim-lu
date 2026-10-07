import type { IncomingMessage, ServerResponse } from "node:http";
import { NodeHttpKernel, type ListenOptions } from "@sim-lu/core";
import { type ErrorHandlerOptions } from "@sim-lu/error";
type UwsHttpRequest = {
    getMethod(): string;
    getUrl(): string;
    getQuery(): string;
    getHeader(name: string): string;
    forEach(callback: (key: string, value: string) => void): void;
    getParams(): Record<string, string>;
};
type UwsHttpResponse = {
    onData(handler: (chunk: ArrayBuffer, isLast: boolean) => void): UwsHttpResponse;
    onAborted(handler: () => void): UwsHttpResponse;
    cork(handler: () => void): void;
    writeStatus(status: string): UwsHttpResponse;
    writeHeader(key: string, value: string): UwsHttpResponse;
    end(body?: string | ArrayBuffer): UwsHttpResponse;
};
type UwsListenSocket = object;
type UwsTemplatedApp = {
    get(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    post(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    put(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    del(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    patch(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    options(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    head(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    connect(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    trace(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    any(path: string, handler: (response: UwsHttpResponse, request: UwsHttpRequest) => void): UwsTemplatedApp;
    listen(host: string, port: number, callback: (listenSocket: UwsListenSocket | false) => void): UwsTemplatedApp;
};
export interface UwsAdapterOptions {
    readonly error?: ErrorHandlerOptions;
}
export declare class UwsAdapter extends NodeHttpKernel {
    readonly name = "uws";
    private uwsApp;
    private listenSocket;
    private uwsModule;
    constructor(options?: UwsAdapterOptions);
    getInstance(): UwsTemplatedApp | undefined;
    listen(options: ListenOptions): Promise<void>;
    protected handle(incoming: IncomingMessage, outgoing: ServerResponse): Promise<void>;
    close(): Promise<void>;
    private bindUwsRoutes;
    private dispatchUws;
    private toHttpRequest;
    private readUwsBody;
    private writeUws;
    private writeSerializedUws;
    private toUwsPath;
    private loadUws;
}
export {};
//# sourceMappingURL=uws-adapter.d.ts.map