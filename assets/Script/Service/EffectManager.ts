import PoolManager from "./PoolManager";
import AudioManager from "./AudioManager";

const { ccclass } = cc._decorator;

@ccclass
export default class EffectManager {
    private static _instance: EffectManager = null;
    public static get instance(): EffectManager {
        if (!this._instance) this._instance = new EffectManager();
        return this._instance;
    }

    public spawnExplosionFX(container: cc.Node, pos: cc.Vec2, fxType: number) {
        const fx = PoolManager.instance.getEffect(fxType);
        if (!fx) return;

        fx.parent = container;
        fx.zIndex = cc.macro.MAX_ZINDEX;
        fx.setPosition(pos.x, pos.y);
        fx.active = true;

        const ps = fx.getComponent(cc.ParticleSystem);
        if (ps) {
            ps.stopSystem();
            ps.resetSystem();
        }

        cc.Canvas.instance.node.getComponent(cc.Component).scheduleOnce(() => {
            if (cc.isValid(fx)) {
                PoolManager.instance.putEffect(fx, fxType);
            }
        }, 1.2);
    }

    public playExplosionEffects(container: cc.Node, pos: cc.Vec2, tileType: number) {
        switch (tileType) {
            case 6: // Ракета H
                this.spawnExplosionFX(container, pos, 1);
                AudioManager.instance.play('blast');
                break;
            case 7: // Ракета V
                this.spawnExplosionFX(container, pos, 2);
                AudioManager.instance.play('blast');
                break;
            case 8: // Бомба
            case 9: // Мега
                this.spawnExplosionFX(container, pos, 3);
                AudioManager.instance.play('booster');
                break;
            default: // Обычный блок
                this.spawnExplosionFX(container, pos, 0);
        }
    }

    public spawnCrossFX(container: cc.Node, pos: cc.Vec2) {
        this.spawnExplosionFX(container, pos, 1);
        this.spawnExplosionFX(container, pos, 2);
    }

    public shakeCamera() {
        const mainCamera = cc.find("Canvas/Main Camera");
        if (!mainCamera) return;

        cc.tween(mainCamera)
            .by(0.05, { x: 10, y: 10 })
            .by(0.05, { x: -20, y: -10 })
            .by(0.05, { x: 10, y: 0 })
            .start();
    }

    public showScoreAnimation(worldPos: cc.Vec2, amount: number) {
        const popup = PoolManager.instance.getScorePopup();
        if (!popup) return;

        const canvas = cc.find("Canvas");
        popup.parent = canvas;
        popup.zIndex = cc.macro.MAX_ZINDEX;

        const localPos = canvas.convertToNodeSpaceAR(worldPos);
        popup.setPosition(localPos);

        const label = popup.getComponent(cc.Label) || popup.getComponentInChildren(cc.Label);
        if (label) label.string = `+${amount}`;

        cc.tween(popup)
            .parallel(
                cc.tween().by(0.8, { y: 150 }, { easing: 'sineOut' }),
                cc.tween().to(0.8, { opacity: 0 })
            )
            .call(() => PoolManager.instance.putScorePopup(popup))
            .start();
    }
}
