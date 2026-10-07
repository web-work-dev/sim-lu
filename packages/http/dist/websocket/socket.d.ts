export interface WebSocketSocket {
    readonly id: string;
    send(data: string | ArrayBuffer | Uint8Array): void;
    close(code?: number, reason?: string): void;
    terminate(): void;
}
//# sourceMappingURL=socket.d.ts.map