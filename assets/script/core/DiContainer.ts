export type Token<T> = string & { __type?: T };

export class DiContainer {
    private registry: Map<string, unknown> = new Map();

    public registerInstance<T>(token: Token<T>, instance: T): void {
        this.registry.set(token, instance);
    }

    public isRegistered<T>(token: Token<T>): boolean {
        return this.registry.has(token);
    }

    public resolve<T>(token: Token<T>): T {
        if (!this.registry.has(token)) {
            throw new Error(`DI token is not registered: ${token}`);
        }
        return this.registry.get(token) as T;
    }
}

export const appContainer = new DiContainer();
