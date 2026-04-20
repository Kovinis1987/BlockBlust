import BoardInputService from "../../assets/script/gameplay/board/BoardInputService";
import {TileType} from "../../assets/script/gameplay/types/TileType";

function createTileNode(row: number, col: number) {
    const parent = {
        sortAllChildren() {}
    };

    return {
        parent,
        zIndex: 0,
        scale: 1,
        position: {x: col * 10, y: row * 10},
        getComponent() {
            return {
                gridPos: {x: col, y: row},
                type: TileType.RED
            };
        }
    };
}

describe("BoardInputService", () => {
    it("spends a move after successful bomb use", () => {
        const service = new BoardInputService();
        const useMove = vi.fn();

        service.handleTileClick(1, 2, {
            isProcessing: false,
            gameStateMachine: {
                isBombMode() {
                    return true;
                },
                isTeleportMode() {
                    return false;
                },
                isPlaying() {
                    return true;
                }
            },
            handleBombAt() {
                return true;
            },
            gameSessionService: {
                useMove
            },
            audioManager: {
                play() {}
            },
            model: {
                getTile() {
                    return 2;
                }
            },
            setProcessing() {},
            activateBooster() {},
            tryBlast() {},
            highlightTeleportSelection() {},
            clearTeleportSelectionVisual() {},
            swapTeleportTiles(_first: unknown, _second: unknown, onComplete: Function) {
                onComplete();
            },
            onTeleportCompleted() {}
        } as any);

        expect(useMove).toHaveBeenCalledTimes(1);
    });

    it("activates booster and spends a move in playing mode", () => {
        const service = new BoardInputService();
        const useMove = vi.fn();
        const activateBooster = vi.fn();

        service.handleTileClick(0, 0, {
            isProcessing: false,
            gameStateMachine: {
                isBombMode() {
                    return false;
                },
                isTeleportMode() {
                    return false;
                },
                isPlaying() {
                    return true;
                }
            },
            handleBombAt() {
                return false;
            },
            gameSessionService: {
                useMove
            },
            audioManager: {
                play() {}
            },
            model: {
                getTile() {
                    return 8;
                }
            },
            setProcessing() {},
            activateBooster,
            tryBlast() {},
            highlightTeleportSelection() {},
            clearTeleportSelectionVisual() {},
            swapTeleportTiles(_first: unknown, _second: unknown, onComplete: Function) {
                onComplete();
            },
            onTeleportCompleted() {}
        } as any);

        expect(activateBooster).toHaveBeenCalledWith(0, 0, 8);
        expect(useMove).toHaveBeenCalledTimes(1);
    });

    it("swaps tiles in teleport mode and finishes teleport flow", () => {
        const service = new BoardInputService();
        const firstNode = createTileNode(0, 0);
        const secondNode = createTileNode(1, 1);
        const setTile = vi.fn();
        const setProcessing = vi.fn();
        const onTeleportCompleted = vi.fn();
        const play = vi.fn();

        const highlightTeleportSelection = vi.fn();
        const clearTeleportSelectionVisual = vi.fn();
        const swapTeleportTiles = vi.fn((_first, _second, onComplete: Function) => onComplete());

        const context = {
            isProcessing: false,
            gameStateMachine: {
                isBombMode() {
                    return false;
                },
                isTeleportMode() {
                    return true;
                },
                isPlaying() {
                    return false;
                }
            },
            handleBombAt() {
                return false;
            },
            gameSessionService: {
                useMove() {}
            },
            audioManager: {
                play
            },
            model: {
                getTile(row: number, col: number) {
                    return row === 0 && col === 0 ? TileType.RED : TileType.BLUE;
                },
                setTile
            },
            setProcessing,
            activateBooster() {},
            tryBlast() {},
            highlightTeleportSelection,
            clearTeleportSelectionVisual,
            swapTeleportTiles,
            onTeleportCompleted
        } as any;

        service.handleTileClick(0, 0, context);
        service.handleTileClick(1, 1, context);

        expect(play).toHaveBeenCalledWith("click");
        expect(highlightTeleportSelection).toHaveBeenCalledWith({r: 0, c: 0});
        expect(clearTeleportSelectionVisual).toHaveBeenCalledWith({r: 0, c: 0});
        expect(swapTeleportTiles).toHaveBeenCalledWith({r: 0, c: 0}, {r: 1, c: 1}, expect.any(Function));
        expect(setTile).toHaveBeenNthCalledWith(1, 0, 0, TileType.BLUE);
        expect(setTile).toHaveBeenNthCalledWith(2, 1, 1, TileType.RED);
        expect(setProcessing).toHaveBeenCalledWith(true);
        expect(onTeleportCompleted).toHaveBeenCalledTimes(1);
    });
});
