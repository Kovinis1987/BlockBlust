import GridPhysicsService from "../../assets/Script/Gameplay/Board/GridPhysicsService";

describe("GridPhysicsService", () => {
    it("resolves chained movements into final node moves", () => {
        const service = new GridPhysicsService();
        const nodeByCell = new Map<string, any>();
        const movedTo: Array<{r: number; c: number}> = [];
        const completions: string[] = [];

        const node = {
            parent: {},
            getComponent() {
                return {
                    gridPos: {x: 0, y: 3},
                    moveTo(r: number, c: number, _pos: unknown, onComplete: Function) {
                        movedTo.push({r, c});
                        onComplete();
                    },
                    init() {}
                };
            }
        };

        nodeByCell.set("3,0", node);

        const context = {
            model: {
                processFalling() {
                    return [
                        {from: {r: 3, c: 0}, to: {r: 2, c: 0}},
                        {from: {r: 2, c: 0}, to: {r: 1, c: 0}},
                        {from: {r: 1, c: 0}, to: {r: 0, c: 0}}
                    ];
                },
                fillEmptyCells() {
                    return [];
                }
            },
            gridContainer: {},
            currentRows: 4,
            tileSizeY: 100,
            poolManager: {
                getTile() {
                    throw new Error("should not request new tile");
                }
            },
            getNodeAt(r: number, c: number) {
                return nodeByCell.get(`${r},${c}`) || null;
            },
            getScreenPosition(r: number, c: number) {
                return {x: c * 10, y: r * 10};
            },
            onTileClick() {},
            onComplete() {
                completions.push("done");
            }
        } as any;

        service.process(context);

        expect(movedTo).toEqual([{r: 0, c: 0}]);
        expect(completions).toEqual(["done"]);
    });

    it("fills new tiles and completes when animations finish", () => {
        const service = new GridPhysicsService();
        const spawned: any[] = [];
        const completions: string[] = [];

        const context = {
            model: {
                processFalling() {
                    return [];
                },
                fillEmptyCells() {
                    return [{r: 0, c: 1, type: 2}];
                }
            },
            gridContainer: {},
            currentRows: 4,
            tileSizeY: 100,
            poolManager: {
                getTile() {
                    const tileNode = {
                        parent: null as unknown,
                        setPosition() {},
                        getComponent() {
                            return {
                                init() {},
                                moveTo(_r: number, _c: number, _pos: unknown, onComplete: Function) {
                                    onComplete();
                                }
                            };
                        }
                    };
                    spawned.push(tileNode);
                    return tileNode;
                }
            },
            getNodeAt() {
                return null;
            },
            getScreenPosition(r: number, c: number) {
                return {x: c * 10, y: r * 10};
            },
            onTileClick() {},
            onComplete() {
                completions.push("done");
            }
        } as any;

        service.process(context);

        expect(spawned).toHaveLength(1);
        expect(completions).toEqual(["done"]);
    });
});
