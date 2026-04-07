import PoolManager from "./PoolManager";
import AudioManager from "./AudioManager";
import EffectTypes from "../Enum/EffectTypes";

const { ccclass } = cc._decorator;

@ccclass
export default class EffectManager {
    private static _instance: EffectManager = null;
    public static get instance(): EffectManager {
        if (!this._instance) this._instance = new EffectManager();
        return this._instance;
    }

    private _durations = {
        [EffectTypes.TILE_NORMAL]: 0.5,
        [EffectTypes.ROCKET_VERTICAL]: 0.6,
        [EffectTypes.ROCKET_HORIZONTAL]: 0.6,
        [EffectTypes.BOMB]: 1.0,
        [EffectTypes.MEGA]: 1.2
    };

    public spawnExplosionFX(container: cc.Node, pos: cc.Vec2, fxType: number) {
        const fx = PoolManager.instance.getEffect(Number(fxType));
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
        const duration = this._durations[fxType] || 1.0;

        cc.Canvas.instance.node.getComponent(cc.Component).scheduleOnce(() => {
            if (cc.isValid(fx)) {
                PoolManager.instance.putEffect(fx, fxType);
            }
        }, duration);

        this.playExplosionSound(fxType);
    }

    private playExplosionSound(fxType: number) {
        switch (fxType) {
            case EffectTypes.ROCKET_VERTICAL:
            case EffectTypes.ROCKET_HORIZONTAL:
                AudioManager.instance.play('blast');
                break;
            case EffectTypes.BOMB:
            case EffectTypes.MEGA:
                AudioManager.instance.play('booster');
                break;
            default:
                AudioManager.instance.play('explosion');
                break;
        }
    }

    public spawnCrossFX(container: cc.Node, pos: cc.Vec2) {
        this.spawnExplosionFX(container, pos, EffectTypes.ROCKET_VERTICAL);
        this.spawnExplosionFX(container, pos, EffectTypes.ROCKET_HORIZONTAL);
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