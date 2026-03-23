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
        this._tilePool = new cc.NodePool();
        const initialCount = 81;
        for (let i = 0; i < initialCount; i++) {
            let tile = cc.instantiate(this.tilePrefab);
            this._tilePool.put(tile);
        }
    }

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

    public putTile(tile: cc.Node) {
        tile.stopAllActions();
        this._tilePool.put(tile);
    }
}