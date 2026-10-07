export class GreetService {
    public greet(name: string, sessionId?: string): Record<string, unknown> {
        return {
            message: `Hello, ${name}!`,
            length: name.length,
            sessionId: sessionId ?? "anonymous",
        };
    }
}
