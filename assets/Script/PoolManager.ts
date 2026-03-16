const { ccclass, property } = cc._decorator;

@ccclass
export default class PoolManager extends cc.Component {
    @property(cc.Prefab)
    tilePrefab: cc.Prefab = null;

    private static _instance: PoolManager = null;
    private _tilePool: cc.NodePool = null;

    public static get instance(): PoolManager {
        return this._instance;
    }

    onLoad() {
        PoolManager._instance = this;
        // Инициализируем пул
        this._tilePool = new cc.NodePool();
        console.log("PoolManager onLoad")
        // Предварительно создаем 50-100 тайлов (зависит от размера сетки),
        // чтобы не было задержки при первом старте уровня
        const initialCount = 64;
        for (let i = 0; i < initialCount; i++) {
            let tile = cc.instantiate(this.tilePrefab);
            this._tilePool.put(tile);
        }
    }

    /**
     * Получить тайл из пула
     */
    public getTile(): cc.Node {
        let tile = null;
        if (this._tilePool.size() > 0) {
            tile = this._tilePool.get();
        } else {
            // Если пул пуст, создаем новый (на всякий случай)
            tile = cc.instantiate(this.tilePrefab);
        }
        return tile;
    }

    /**
     * Вернуть тайл в пул
     */
    public putTile(tile: cc.Node) {
        // Важно: перед возвратом в пул останавливаем все текущие анимации на ноде
        tile.stopAllActions();
        this._tilePool.put(tile);
    }
}