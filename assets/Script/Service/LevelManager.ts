import {LevelData} from "../Interface/LevelData";
import DataService from "./DataService";

export default class LevelManager {
    private static _instance: LevelManager;
    public static get instance(): LevelManager {
        if (!this._instance) this._instance = new LevelManager();
        return this._instance;
    }

    loadLevel(levelIndex: number, onComplete?: (data: LevelData) => void) {
        cc.resources.load('configs/levels', cc.JsonAsset, (err, res: cc.JsonAsset) => {
            if (err) {
                console.error("Ошибка загрузки levels.json:", err);
                return;
            }

            let data;
            if (!res.json || !res.json[levelIndex]) {
                cc.warn("Уровень не найден. Используем дефолт...");
                data = {
                    rows: 9,
                    cols: 9,
                    moves: 25,
                    targetScore: 1500,
                    tiles: null
                };
            } else {
                data = res.json[levelIndex];
            }

            if (onComplete) {
                onComplete(data);
            }
        });
    }

    public restart() {
        const currentLevel = DataService.instance.currentLevel;
        this.loadLevel(currentLevel, (levelData) => {
            DataService.instance.resetLevel(
                currentLevel,
                levelData.moves ?? 25,
                levelData.targetScore ?? 1500
            );
        });
    }

    public nextLevel() {
        const nextLevel = DataService.instance.currentLevel + 1;
        this.loadLevel(nextLevel, (levelData) => {
            DataService.instance.resetLevel(
                nextLevel,
                levelData.moves ?? 25,
                levelData.targetScore ?? 1500
            );
        });
    }
}