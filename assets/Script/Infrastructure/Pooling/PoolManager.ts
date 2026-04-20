import TileComponent from "../../presentation/components/TileComponent";

const {ccclass, property} = cc._decorator;

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

    private tilePool: cc.NodePool = null;
    private scorePopupPool: cc.NodePool = null;
    private boosterPools: Map<number, cc.NodePool> = new Map();
    private effectPools: Map<number, cc.NodePool> = new Map();

    onLoad() {
        this.tilePool = new cc.NodePool();
        this.scorePopupPool = new cc.NodePool();

        for (let i = 0; i < 81; i++) {
            this.tilePool.put(cc.instantiate(this.tilePrefab));
        }
    }

    public getTile(): cc.Node {
        return this.tilePool.size() > 0 ? this.tilePool.get() : cc.instantiate(this.tilePrefab);
    }

    public putTile(tile: cc.Node) {
        tile.stopAllActions();

        const type = tile.getComponent(TileComponent).type;
        if (type >= 6 && type <= 9) {
            this.putBooster(tile, type);
            return;
        }

        this.tilePool.put(tile);
    }

    public getScorePopup(): cc.Node {
        const node = this.scorePopupPool.size() > 0
            ? this.scorePopupPool.get()
            : cc.instantiate(this.scorePopupPrefab);

        if (!node) return null;

        node.active = true;
        node.opacity = 255;
        node.scale = 1;
        return node;
    }

    public putScorePopup(node: cc.Node) {
        cc.tween(node).stop();
        this.scorePopupPool.put(node);
    }

    public getBooster(type: number): cc.Node {
        if (!this.boosterPools.has(type)) {
            this.boosterPools.set(type, new cc.NodePool());
        }

        const pool = this.boosterPools.get(type);
        let node: cc.Node = null;

        if (pool.size() > 0) {
            node = pool.get();
        } else {
            const prefab = this.boosterPrefabs[type - 6];
            if (!prefab) {
                cc.error(`Prefab for booster type ${type} is missing`);
                return null;
            }
            node = cc.instantiate(prefab);
        }

        node.active = true;
        node.scale = 1;
        node.opacity = 255;
        return node;
    }

    public putBooster(node: cc.Node, type: number) {
        cc.tween(node).stop();
        if (!this.boosterPools.has(type)) {
            this.boosterPools.set(type, new cc.NodePool());
        }
        this.boosterPools.get(type).put(node);
    }

    public getEffect(type: number): cc.Node {
        if (!this.effectPools.has(type)) {
            this.effectPools.set(type, new cc.NodePool());
        }

        const pool = this.effectPools.get(type);
        const node = pool.size() > 0 ? pool.get() : cc.instantiate(this.effectPrefabs[type]);
        if (!node) return null;

        node.active = true;
        const ps = node.getComponent(cc.ParticleSystem);
        if (ps) {
            ps.stopSystem();
            ps.resetSystem();
        }
        return node;
    }

    public putEffect(node: cc.Node, type: number) {
        if (!node || !cc.isValid(node)) return;

        const ps = node.getComponent(cc.ParticleSystem);
        if (ps) {
            ps.stopSystem();
        }

        node.active = false;
        node.removeFromParent(false);

        if (!this.effectPools.has(type)) {
            this.effectPools.set(type, new cc.NodePool());
        }
        this.effectPools.get(type).put(node);
    }
}
