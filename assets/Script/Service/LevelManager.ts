import {LevelData} from "../Interface/LevelData";
import DataService from "./DataService";

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
    };

    constructor(private dataService: DataService) {
    }

    public loadCurrentLevel(onComplete?: (data: LoadedLevelData) => void) {
        this.loadLevelByIndex(this.dataService.currentLevel, onComplete);
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
        } : LevelManager.DEFAULT_LEVEL;

        return {
            levelIndex,
            rows: normalized.rows,
            cols: normalized.cols,
            moves: normalized.moves,
            targetScore: normalized.targetScore,
            tiles: normalized.tiles,
        };
    }
}
