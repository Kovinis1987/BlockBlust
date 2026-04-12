import LevelManager from "../../assets/Script/Gameplay/Session/LevelManager";
import GameSignals from "../../assets/Script/Gameplay/Session/GameSignals";
import GameStore from "../../assets/Script/Gameplay/Session/GameStore";

describe("LevelManager", () => {
    const originalLoad = cc.resources.load;
    const originalWarn = cc.warn;
    const originalError = console.error;

    afterEach(() => {
        cc.resources.load = originalLoad;
        cc.warn = originalWarn;
        console.error = originalError;
    });

    it("loads current level from resource json", async () => {
        const gameStore = new GameStore(new GameSignals());
        gameStore.setCurrentLevel(1);
        const manager = new LevelManager(gameStore);

        cc.resources.load = (_path: string, _type: unknown, callback: Function) => {
            callback(null, {
                json: [
                    {rows: 3, cols: 3, moves: 10, targetScore: 1000, tiles: [1]},
                    {rows: 4, cols: 5, moves: 12, targetScore: 2000, tiles: [2, 3]}
                ]
            });
        };

        const result = await new Promise<any>((resolve) => {
            manager.loadCurrentLevel(resolve);
        });

        expect(result).toEqual({
            levelIndex: 1,
            rows: 4,
            cols: 5,
            moves: 12,
            targetScore: 2000,
            tiles: [2, 3],
            bonusBombBoosters: 0,
            bonusTeleportBoosters: 0,
            startRowRocketTiles: 0,
            startColumnRocketTiles: 0,
            startBombTiles: 0,
            startMegaTiles: 0
        });
    });

    it("falls back to default level when resource loading fails", async () => {
        const gameStore = new GameStore(new GameSignals());
        const manager = new LevelManager(gameStore);
        const errors: unknown[] = [];

        console.error = (...args: unknown[]) => errors.push(args);
        cc.resources.load = (_path: string, _type: unknown, callback: Function) => {
            callback(new Error("load failed"), null);
        };

        const result = await new Promise<any>((resolve) => {
            manager.loadCurrentLevel(resolve);
        });

        expect(result).toEqual({
            levelIndex: 0,
            rows: 9,
            cols: 9,
            moves: 25,
            targetScore: 1500,
            tiles: null,
            bonusBombBoosters: 0,
            bonusTeleportBoosters: 0,
            startRowRocketTiles: 0,
            startColumnRocketTiles: 0,
            startBombTiles: 0,
            startMegaTiles: 0
        });
        expect(errors.length).toBeGreaterThan(0);
    });

    it("uses default values when a level is missing", async () => {
        const gameStore = new GameStore(new GameSignals());
        gameStore.setCurrentLevel(5);
        const manager = new LevelManager(gameStore);
        const warnings: unknown[] = [];

        cc.warn = (...args: unknown[]) => warnings.push(args);
        cc.resources.load = (_path: string, _type: unknown, callback: Function) => {
            callback(null, {json: []});
        };

        const result = await new Promise<any>((resolve) => {
            manager.loadCurrentLevel(resolve);
        });

        expect(result.levelIndex).toBe(5);
        expect(result.rows).toBe(9);
        expect(result.bonusBombBoosters).toBe(1);
        expect(result.bonusTeleportBoosters).toBe(2);
        expect(result.startRowRocketTiles).toBe(0);
        expect(result.startColumnRocketTiles).toBe(0);
        expect(result.startBombTiles).toBe(0);
        expect(result.startMegaTiles).toBe(0);
        expect(warnings.length).toBeGreaterThan(0);
    });
});
