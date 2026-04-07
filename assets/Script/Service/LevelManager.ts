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

    public nextLevel(onComplete?: (data: LevelData) => void) {
        const nextLevel = DataService.instance.currentLevel + 1;
        DataService.instance.currentLevel = nextLevel; // ✅ Увеличиваем уровень

        this.loadLevel(nextLevel, (levelData) => {
            // ✅ Можно сбросить уровень здесь, но лучше в GameController
            if (onComplete) {
                onComplete(levelData);
            }
        });
    }
}