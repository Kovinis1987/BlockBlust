import TileComponent from "./Component/TileComponent";

const { ccclass, property } = cc._decorator;

@ccclass
export default class PoolManager extends cc.Component {
    @property(cc.Prefab)
    tilePrefab: cc.Prefab = null;

    @property(cc.Prefab)
    scorePopupPrefab: cc.Prefab = null;

    @property([cc.Prefab])
    boosterPrefabs: cc.Prefab[] = [];

    @property([cc.Prefab])
    effectPrefabs: cc.Prefab[] = [];

    private static _instance: PoolManager = null;

    private _tilePool: cc.NodePool = null;
    private _scorePopupPool: cc.NodePool = null;
    private _boosterPools: Map<number, cc.NodePool> = new Map();
    private _effectPools: Map<number, cc.NodePool> = new Map();

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
        
        const type = tile.getComponent(TileComponent).type;
        if (type >= 6 && type <= 9) {
            this.putBooster(tile, type);
            return;
        }
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
        if (!this._boosterPools.has(type)) {
            this._boosterPools.set(type, new cc.NodePool());
        }

        let pool = this._boosterPools.get(type);
        let node: cc.Node = null;

        if (pool.size() > 0) {
            node = pool.get();
        } else {
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

    public getEffect(type: number): cc.Node {
        if (!this._effectPools.has(type)) {
            this._effectPools.set(type, new cc.NodePool());
        }

        let pool = this._effectPools.get(type);
        let node = pool.size() > 0 ? pool.get() : cc.instantiate(this.effectPrefabs[type]);

        if (node) {
            node.active = true;
            let ps = node.getComponent(cc.ParticleSystem);
            if (ps) {
                ps.stopSystem();
                ps.resetSystem();
            }
            return node;
        }
        return null;
    }

    public putEffect(node: cc.Node, type: number) {
        if (!node || !cc.isValid(node)) return;

        const ps = node.getComponent(cc.ParticleSystem);
        if (ps) {
            ps.stopSystem();
        }

        node.active = false;
        node.removeFromParent(false);

        if (!this._effectPools.has(type)) {
            this._effectPools.set(type, new cc.NodePool());
        }
        this._effectPools.get(type).put(node);
    }
}
