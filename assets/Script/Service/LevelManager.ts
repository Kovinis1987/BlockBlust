import {LevelData} from "../Interface/LevelData";

export default class LevelManager {
    private static _instance: LevelManager;
    public static get instance(): LevelManager {
        if (!this._instance) this._instance = new LevelManager();
        return this._instance;
    }

    loadLevel(levelIndex: number, onComplete?: (data: LevelData) => void) {
        console.log("LevelManager: загрузка уровня", levelIndex);

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
                console.log("🎯 Данные уровня:", data);
            }

            if (onComplete) {
                onComplete(data);
            }
        });
    }
}