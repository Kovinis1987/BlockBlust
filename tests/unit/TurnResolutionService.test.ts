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
            board: {
                hasTileAt() {
                    return true;
                },
                countTilesAt() {
                    return 2;
                },
                shakeTile() {},
                destroyTileAt() {
                    return false;
                },
                recycleBoosterAt() {
                    return false;
                },
                getScreenPosition() {
                    return {x: 0, y: 0};
                },
                toWorldPosition(pos: unknown) {
                    return pos;
                },
                showScore() {},
                spawnCrossFx() {},
                spawnExplosionFx() {},
                shakeCamera() {},
                playSound() {},
                schedule() {},
                processPhysics() {}
            },
            setProcessing() {},
            currentRows: 1,
            currentCols: 3,
            finalizePhysics() {},
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
            board: {
                shakeTile: shake
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
                getTile() {
                    return TileType.RED;
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
            board: {
                hasTileAt() {
                    return true;
                },
                countTilesAt() {
                    return nodes.length;
                },
                shakeTile() {},
                destroyTileAt(_r: number, _c: number, onComplete: Function) {
                    putTile();
                    onComplete();
                    return true;
                },
                recycleBoosterAt() {
                    return false;
                },
                spawnBooster,
                getScreenPosition(r: number, c: number) {
                    return {x: c * 10, y: r * 10};
                },
                toWorldPosition(pos: unknown) {
                    return pos;
                },
                showScore: showScoreAnimation,
                spawnCrossFx() {},
                spawnExplosionFx() {},
                shakeCamera() {},
                playSound() {},
                schedule() {},
                processPhysics() {
                    process();
                }
            },
            setProcessing() {},
            currentRows: 1,
            currentCols: 4,
            finalizePhysics() {},
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
        const spawnExplosionFx = vi.fn();
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
            board: {
                hasTileAt(row: number, col: number) {
                    return (row === 1 && col === 1) || (row === 1 && col === 0) || (row === 1 && col === 2);
                },
                countTilesAt(coords: Array<{r: number; c: number}>) {
                    return coords.filter((coord) => this.hasTileAt(coord.r, coord.c)).length;
                },
                shakeTile() {},
                destroyTileAt(_r: number, _c: number, onComplete: Function) {
                    putTile();
                    onComplete();
                    return true;
                },
                spawnBooster() {},
                spawnCrossFx() {},
                spawnExplosionFx,
                showScore() {},
                shakeCamera,
                playSound() {},
                recycleBoosterAt(_r: number, _c: number, type: number) {
                    putBooster(centerNode, type);
                    return true;
                },
                processPhysics() {
                    process();
                },
                toWorldPosition(pos: unknown) {
                    return pos;
                },
                getScreenPosition(r: number, c: number) {
                    return {x: c * 10, y: r * 10};
                },
                schedule(callback: Function) {
                    callback();
                }
            },
            setProcessing() {},
            currentRows: 3,
            currentCols: 3,
            finalizePhysics() {},
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
        expect(spawnExplosionFx).toHaveBeenCalled();
        expect(clearCells).toHaveBeenCalled();
        expect(putBooster).toHaveBeenCalledWith(centerNode, TileType.ROCKET_VERTICAL);
        expect(putTile).toHaveBeenCalledTimes(2);
        expect(addScore).toHaveBeenCalledTimes(2);
        expect(process).toHaveBeenCalledTimes(1);
    });
});
