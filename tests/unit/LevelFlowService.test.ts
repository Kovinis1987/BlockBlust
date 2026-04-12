import LevelFlowService from "../../assets/Script/Gameplay/Flow/LevelFlowService";

describe("LevelFlowService", () => {
    it("resets level progress on initial load when requested", () => {
        const checkPossibleMoves = vi.fn();
        const service = new LevelFlowService({
            checkPossibleMoves
        } as any);
        const resetLevel = vi.fn();
        const setProcessing = vi.fn();
        const clearBoard = vi.fn();
        const setupLevel = vi.fn();

        service.loadCurrentLevel({
            levelManager: {
                loadCurrentLevel(onComplete: Function) {
                    onComplete({
                        levelIndex: 2,
                    rows: 9,
                    cols: 9,
                    moves: 20,
                    targetScore: 1500,
                    tiles: [],
                    bonusBombBoosters: 1,
                    bonusTeleportBoosters: 2,
                    startRowRocketTiles: 1,
                    startColumnRocketTiles: 0,
                    startBombTiles: 0,
                    startMegaTiles: 0
                    });
                }
            },
            gameSessionService: {
                resetLevel,
                grantLevelBonusBoosters: vi.fn()
            },
            gameProgressionContext: {} as any,
            clearBoard,
            setProcessing,
            setupLevel
        } as any, true, false, true);

        expect(clearBoard).toHaveBeenCalledTimes(1);
        expect(setupLevel).toHaveBeenCalledTimes(1);
        expect(resetLevel).toHaveBeenCalledWith(2, 20, 1500);
        expect(checkPossibleMoves).not.toHaveBeenCalled();
    });

    it("checks moves after load when requested", () => {
        const checkPossibleMoves = vi.fn();
        const service = new LevelFlowService({
            checkPossibleMoves
        } as any);

        service.reloadCurrentLevel({
            levelManager: {
                reloadCurrentLevel(onComplete: Function) {
                    onComplete({
                        levelIndex: 3,
                    rows: 8,
                    cols: 8,
                    moves: 15,
                    targetScore: 1000,
                    tiles: [],
                    bonusBombBoosters: 1,
                    bonusTeleportBoosters: 1,
                    startRowRocketTiles: 0,
                    startColumnRocketTiles: 1,
                    startBombTiles: 1,
                    startMegaTiles: 0
                    });
                }
            },
            gameSessionService: {
                resetLevel() {},
                grantLevelBonusBoosters: vi.fn()
            },
            gameProgressionContext: {tag: "ctx"} as any,
            clearBoard() {},
            setProcessing() {},
            setupLevel() {}
        } as any, false, true, false);

        expect(checkPossibleMoves).toHaveBeenCalledWith({tag: "ctx"});
    });

    it("grants level bonus boosters only when allowed", () => {
        const service = new LevelFlowService({
            checkPossibleMoves() {}
        } as any);
        const resetLevel = vi.fn();
        const grantLevelBonusBoosters = vi.fn();

        service.loadCurrentLevel({
            levelManager: {
                loadCurrentLevel(onComplete: Function) {
                    onComplete({
                        levelIndex: 8,
                        rows: 9,
                        cols: 9,
                        moves: 16,
                        targetScore: 2600,
                        tiles: [],
                        bonusBombBoosters: 2,
                        bonusTeleportBoosters: 2,
                        startRowRocketTiles: 1,
                        startColumnRocketTiles: 1,
                        startBombTiles: 1,
                        startMegaTiles: 1
                    });
                }
            },
            gameSessionService: {
                resetLevel,
                grantLevelBonusBoosters
            },
            gameProgressionContext: {} as any,
            clearBoard() {},
            setProcessing() {},
            setupLevel() {}
        } as any, true, false, true);

        expect(resetLevel).toHaveBeenCalledWith(8, 16, 2600);
        expect(grantLevelBonusBoosters).toHaveBeenCalledWith(2, 2);
    });
});
