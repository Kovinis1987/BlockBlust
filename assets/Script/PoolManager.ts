const { ccclass, property } = cc._decorator;

@ccclass
export default class PoolManager extends cc.Component {
    @property(cc.Prefab)
    tilePrefab: cc.Prefab = null;

    @property(cc.Prefab)
    scorePopupPrefab: cc.Prefab = null;

    // МАССИВ префабов: 0-РакетаH, 1-РакетаV, 2-Бомба, 3-Мега
    @property([cc.Prefab])
    boosterPrefabs: cc.Prefab[] = [];

    private static _instance: PoolManager = null;
    private _tilePool: cc.NodePool = null;
    private _scorePopupPool: cc.NodePool = null;

    // Карта пулов для каждого типа бустера
    private _boosterPools: Map<number, cc.NodePool> = new Map();

    public static get instance(): PoolManager {
        return this._instance;
    }

    onLoad() {
        PoolManager._instance = this;
        this._tilePool = new cc.NodePool();
        this._scorePopupPool = new cc.NodePool();

        for (let i = 0; i < 81; i++) {
            this._tilePool.put(cc.instantiate(this.tilePrefab));
        }
    }

    public getTile(): cc.Node {
        return this._tilePool.size() > 0 ? this._tilePool.get() : cc.instantiate(this.tilePrefab);
    }

    public putTile(tile: cc.Node) {
        tile.stopAllActions();
        this._tilePool.put(tile);
    }

    public getScorePopup(): cc.Node {
        let node = this._scorePopupPool.size() > 0 ? this._scorePopupPool.get() : cc.instantiate(this.scorePopupPrefab);
        node.active = true;
        node.opacity = 255;
        node.scale = 1;
        return node;
    }

    public putScorePopup(node: cc.Node) {
        cc.tween(node).stop();
        this._scorePopupPool.put(node);
    }

    public getBooster(type: number): cc.Node {
        // Создаем пул для этого типа, если его еще нет
        if (!this._boosterPools.has(type)) {
            this._boosterPools.set(type, new cc.NodePool());
        }

        let pool = this._boosterPools.get(type);
        let node: cc.Node = null;

        if (pool.size() > 0) {
            node = pool.get();
        } else {
            // Индекс: тип 6 -> индекс 0, тип 7 -> индекс 1 и т.д.
            const prefab = this.boosterPrefabs[type - 6];
            if (prefab) {
                node = cc.instantiate(prefab);
            } else {
                cc.error(`Префаб для бустера типа ${type} не найден в массиве!`);
                return null;
            }
        }

        node.active = true;
        node.scale = 1;
        node.opacity = 255;
        return node;
    }

    public putBooster(node: cc.Node, type: number) {
        cc.tween(node).stop();
        if (!this._boosterPools.has(type)) {
            this._boosterPools.set(type, new cc.NodePool());
        }
        this._boosterPools.get(type).put(node);
    }
}
