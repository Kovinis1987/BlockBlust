import TurnResolutionService from "../../assets/script/gameplay/flow/TurnResolutionService";
import {TileType} from "../../assets/script/gameplay/types/TileType";

function createTileNode(row: number, col: number, type: number) {
    return {
        parent: {},
        getPosition() {
            return {x: col * 10, y: row * 10};
        },
        getComponent() {
            return {
                gridPos: {x: col, y: row},
                type,
                shake() {},
                destroyTile(callback: Function) {
                    callback();
                }
            };
        }
    };
}

describe("TurnResolutionService", () => {
    it("does not spend a move when board is desynchronized before blast", () => {
        const service = new TurnResolutionService();
        const useMove = vi.fn();

        service.tryBlast(0, 0, {
            isProcessing: false,
            model: {
                findGroup() {
                    return [{r: 0, c: 0}, {r: 0, c: 1}, {r: 0, c: 2}];
                }
            },
            gameSessionService: {
                useMove
            },
            getNodesByCoords() {
                return [{}, {}];
            },
            getNodeAt() {
                return {
                    getPosition() {
                        return {x: 0, y: 0};
                    }
                };
            },
            setProcessing() {},
            audioManager: {},
            effectManager: {},
            poolManager: {},
            gridPhysicsService: {},
            gridContainer: {},
            currentRows: 1,
            currentCols: 3,
            tileSizeY: 100,
            getScreenPosition() {
                return {x: 0, y: 0};
            },
            onTileClick() {},
            spawnBooster() {},
            finalizePhysics() {},
            scheduleOnce() {},
            config: {
                economy: {
                    scoreTile: 10
                }
            },
            gameStore: {}
        } as any);

        expect(useMove).not.toHaveBeenCalled();
    });

    it("shakes tile when clicked group is too small", () => {
        const service = new TurnResolutionService();
        const shake = vi.fn();

        service.tryBlast(0, 0, {
            isProcessing: false,
            model: {
                findGroup() {
                    return [{r: 0, c: 0}];
                }
            },
            getNodeAt() {
                return {
                    getComponent() {
                        return {
                            shake
                        };
                    }
                };
            }
        } as any);

        expect(shake).toHaveBeenCalledTimes(1);
    });

    it("destroys a valid group, awards score and processes physics", () => {
        const service = new TurnResolutionService();
        const useMove = vi.fn();
        const addScore = vi.fn();
        const process = vi.fn();
        const clearCells = vi.fn();
        const showScoreAnimation = vi.fn();
        const putTile = vi.fn();
        const spawnBooster = vi.fn();

        const nodes = [
            createTileNode(0, 0, TileType.RED),
            createTileNode(0, 1, TileType.RED),
            createTileNode(0, 2, TileType.RED),
            createTileNode(0, 3, TileType.RED)
        ];

        service.tryBlast(0, 0, {
            isProcessing: false,
            model: {
                findGroup() {
                    return [
                        {r: 0, c: 0},
                        {r: 0, c: 1},
                        {r: 0, c: 2},
                        {r: 0, c: 3}
                    ];
                },
                getBoosterType() {
                    return {type: TileType.ROCKET_VERTICAL};
                },
                clearCells: clearCells
            },
            gameSessionService: {
                useMove,
                addScore
            },
            getNodesByCoords() {
                return nodes;
            },
            getNodeAt() {
                return nodes[0];
            },
            setProcessing() {},
            audioManager: {},
            effectManager: {
                showScoreAnimation
            },
            poolManager: {
                putTile
            },
            gridPhysicsService: {
                process
            },
            gridContainer: {
                convertToWorldSpaceAR(pos: unknown) {
                    return pos;
                }
            },
            currentRows: 1,
            currentCols: 4,
            tileSizeY: 100,
            getScreenPosition(r: number, c: number) {
                return {x: c * 10, y: r * 10};
            },
            onTileClick() {},
            spawnBooster,
            finalizePhysics() {},
            scheduleOnce() {},
            config: {
                economy: {
                    scoreTile: 10
                }
            },
            gameStore: {}
        } as any);

        expect(useMove).toHaveBeenCalledTimes(1);
        expect(clearCells).toHaveBeenCalled();
        expect(addScore).toHaveBeenCalledWith(40);
        expect(showScoreAnimation).toHaveBeenCalledTimes(1);
        expect(putTile).toHaveBeenCalledTimes(4);
        expect(spawnBooster).toHaveBeenCalledWith(0, 0, TileType.ROCKET_VERTICAL);
        expect(process).toHaveBeenCalledTimes(1);
    });

    it("activates booster plan and resolves regular tiles", () => {
        const service = new TurnResolutionService();
        const process = vi.fn();
        const addScore = vi.fn();
        const spawnExplosionFX = vi.fn();
        const shakeCamera = vi.fn();
        const clearCells = vi.fn();
        const putBooster = vi.fn();
        const putTile = vi.fn();

        const centerNode = createTileNode(1, 1, TileType.ROCKET_VERTICAL);
        const leftNode = createTileNode(1, 0, TileType.RED);
        const rightNode = createTileNode(1, 2, TileType.BLUE);

        service.activateBooster(1, 1, TileType.ROCKET_VERTICAL, {
            isProcessing: false,
            model: {
                getTile(row: number, col: number) {
                    if (row === 1 && col === 1) {
                        return TileType.ROCKET_VERTICAL;
                    }

                    if (row === 1 && (col === 0 || col === 2)) {
                        return TileType.RED;
                    }

                    return TileType.EMPTY;
                },
                clearCells: clearCells
            },
            gameSessionService: {
                addScore
            },
            getNodesByCoords(coords: Array<{r: number; c: number}>) {
                return coords
                    .map((coord) => {
                        if (coord.r === 1 && coord.c === 0) return leftNode;
                        if (coord.r === 1 && coord.c === 2) return rightNode;
                        return null;
                    })
                    .filter(Boolean);
            },
            getNodeAt(row: number, col: number) {
                if (row === 1 && col === 1) {
                    return centerNode;
                }

                return null;
            },
            setProcessing() {},
            audioManager: {},
            effectManager: {
                shakeCamera,
                spawnCrossFX() {},
                spawnExplosionFX,
                showScoreAnimation() {}
            },
            poolManager: {
                putBooster,
                putTile
            },
            gridPhysicsService: {
                process
            },
            gridContainer: {
                convertToWorldSpaceAR(pos: unknown) {
                    return pos;
                }
            },
            currentRows: 3,
            currentCols: 3,
            tileSizeY: 100,
            getScreenPosition(r: number, c: number) {
                return {x: c * 10, y: r * 10};
            },
            onTileClick() {},
            spawnBooster() {},
            finalizePhysics() {},
            scheduleOnce(callback: Function) {
                callback();
            },
            config: {
                boosters: {
                    bombRadius: 1
                },
                animations: {
                    blastWaveDelay: 0
                },
                economy: {
                    scoreTile: 10
                }
            },
            gameStore: {}
        } as any);

        expect(shakeCamera).toHaveBeenCalled();
        expect(spawnExplosionFX).toHaveBeenCalled();
        expect(clearCells).toHaveBeenCalled();
        expect(putBooster).toHaveBeenCalledWith(centerNode, TileType.ROCKET_VERTICAL);
        expect(putTile).toHaveBeenCalledTimes(2);
        expect(addScore).toHaveBeenCalledTimes(2);
        expect(process).toHaveBeenCalledTimes(1);
    });
});
