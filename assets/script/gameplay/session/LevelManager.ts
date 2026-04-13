import {LevelData} from "../Data/LevelData";
import GameStore from "./GameStore";

export interface LoadedLevelData extends LevelData {
    levelIndex: number;
}

export default class LevelManager {
    private static readonly DEFAULT_LEVEL: LevelData = {
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
        startMegaTiles: 0,
    };

    constructor(private readonly gameStore: GameStore) {
    }

    public loadCurrentLevel(onComplete?: (data: LoadedLevelData) => void) {
        this.loadLevelByIndex(this.gameStore.currentLevel, onComplete);
    }

    public reloadCurrentLevel(onComplete?: (data: LoadedLevelData) => void) {
        this.loadCurrentLevel(onComplete);
    }

    private loadLevelByIndex(levelIndex: number, onComplete?: (data: LoadedLevelData) => void) {
        cc.resources.load("configs/levels", cc.JsonAsset, (err, res: cc.JsonAsset) => {
            if (err) {
                console.error("Failed to load levels.json:", err);
                onComplete?.(this.toLoadedLevelData(levelIndex, null));
                return;
            }

            const rawLevel = res.json ? res.json[levelIndex] : null;
            if (!rawLevel) {
                cc.warn("Level not found. Using default level config.");
            }

            onComplete?.(this.toLoadedLevelData(levelIndex, rawLevel));
        });
    }

    private toLoadedLevelData(levelIndex: number, rawLevel: any): LoadedLevelData {
        const normalized: LevelData = rawLevel ? {
            rows: rawLevel.rows ?? LevelManager.DEFAULT_LEVEL.rows,
            cols: rawLevel.cols ?? LevelManager.DEFAULT_LEVEL.cols,
            moves: rawLevel.moves ?? LevelManager.DEFAULT_LEVEL.moves,
            targetScore: rawLevel.targetScore ?? LevelManager.DEFAULT_LEVEL.targetScore,
            tiles: rawLevel.tiles ?? LevelManager.DEFAULT_LEVEL.tiles,
            bonusBombBoosters: rawLevel.bonusBombBoosters ?? this.getDefaultBonusBombBoosters(levelIndex),
            bonusTeleportBoosters: rawLevel.bonusTeleportBoosters ?? this.getDefaultBonusTeleportBoosters(levelIndex),
            startRowRocketTiles: rawLevel.startRowRocketTiles ?? LevelManager.DEFAULT_LEVEL.startRowRocketTiles,
            startColumnRocketTiles: rawLevel.startColumnRocketTiles ?? LevelManager.DEFAULT_LEVEL.startColumnRocketTiles,
            startBombTiles: rawLevel.startBombTiles ?? LevelManager.DEFAULT_LEVEL.startBombTiles,
            startMegaTiles: rawLevel.startMegaTiles ?? LevelManager.DEFAULT_LEVEL.startMegaTiles,
        } : {
            ...LevelManager.DEFAULT_LEVEL,
            bonusBombBoosters: this.getDefaultBonusBombBoosters(levelIndex),
            bonusTeleportBoosters: this.getDefaultBonusTeleportBoosters(levelIndex),
        };

        return {
            levelIndex,
            rows: normalized.rows,
            cols: normalized.cols,
            moves: normalized.moves,
            targetScore: normalized.targetScore,
            tiles: normalized.tiles,
            bonusBombBoosters: normalized.bonusBombBoosters ?? 0,
            bonusTeleportBoosters: normalized.bonusTeleportBoosters ?? 0,
            startRowRocketTiles: normalized.startRowRocketTiles ?? 0,
            startColumnRocketTiles: normalized.startColumnRocketTiles ?? 0,
            startBombTiles: normalized.startBombTiles ?? 0,
            startMegaTiles: normalized.startMegaTiles ?? 0,
        };
    }

    private getDefaultBonusBombBoosters(levelIndex: number): number {
        if (levelIndex === 2) return 1;
        if (levelIndex === 5) return 1;
        if (levelIndex === 8) return 2;
        return 0;
    }

    private getDefaultBonusTeleportBoosters(levelIndex: number): number {
        if (levelIndex === 2) return 1;
        if (levelIndex === 5) return 2;
        if (levelIndex === 8) return 2;
        return 0;
    }
}
