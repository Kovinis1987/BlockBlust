type Listener = {
    callback: Function;
    target?: unknown;
};

class MockEventTarget {
    private readonly listeners = new Map<string, Listener[]>();

    on(type: string, callback: Function, target?: unknown): void {
        const entries = this.listeners.get(type) || [];
        entries.push({callback, target});
        this.listeners.set(type, entries);
    }

    off(type: string, callback?: Function, target?: unknown): void {
        if (!this.listeners.has(type)) {
            return;
        }

        if (!callback) {
            this.listeners.delete(type);
            return;
        }

        const filtered = (this.listeners.get(type) || []).filter((entry) => {
            return entry.callback !== callback || entry.target !== target;
        });

        if (filtered.length === 0) {
            this.listeners.delete(type);
            return;
        }

        this.listeners.set(type, filtered);
    }

    emit(type: string, ...args: unknown[]): void {
        const entries = this.listeners.get(type) || [];
        entries.forEach((entry) => entry.callback.apply(entry.target, args));
    }
}

const decoratorStub = () => () => undefined;

class MockComponent {}

class MockNode {
    public parent: MockNode | null = null;
    public children: MockNode[] = [];
    public x = 0;
    public y = 0;
    public zIndex = 0;
    public active = true;
    public opacity = 255;
    public scale = 1;

    public setPosition(x: number, y?: number): void {
        if (typeof y === "number") {
            this.x = x;
            this.y = y;
            return;
        }

        const value = x as unknown as {x: number; y: number};
        this.x = value.x;
        this.y = value.y;
    }

    public removeFromParent(): void {
        this.parent = null;
    }

    public stopAllActions(): void {}
}

const ccMock = {
    _decorator: {
        ccclass: decoratorStub(),
        property: decoratorStub()
    },
    EventTarget: MockEventTarget,
    Component: MockComponent,
    Node: MockNode,
    NodePool: class {
        private readonly items: unknown[] = [];

        size(): number {
            return this.items.length;
        }

        get(): unknown {
            return this.items.pop();
        }

        put(item: unknown): void {
            this.items.push(item);
        }
    },
    JsonAsset: class {},
    Prefab: class {},
    Sprite: class {},
    SpriteFrame: class {},
    Label: class {},
    Float: Number,
    Integer: Number,
    winSize: {
        width: 720,
        height: 1280
    },
    v2(x: number, y: number) {
        return {x, y};
    },
    v3(x: number, y: number, z = 0) {
        return {x, y, z};
    },
    tween(target: unknown) {
        return {
            delay() { return this; },
            to() { return this; },
            by() { return this; },
            call(callback: Function) {
                callback();
                return this;
            },
            start() { return this; },
            stop() { return this; }
        };
    },
    instantiate<T>(prefab: T): T {
        return prefab;
    },
    isValid(value: unknown): boolean {
        return value !== null && value !== undefined;
    },
    director: {
        getScene() {
            return null;
        }
    },
    resources: {
        load(_path: string, _type: unknown, callback: Function) {
            callback(new Error("Mocked cc.resources.load is not implemented in tests"));
        }
    },
    log() {},
    warn() {},
    error() {}
};

(globalThis as unknown as {cc: typeof ccMock}).cc = ccMock;
