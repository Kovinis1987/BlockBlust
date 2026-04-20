import AudioManager from "../audio/AudioManager";
import EffectTypes from "../../gameplay/types/EffectTypes";
import PoolManager from "../pooling/PoolManager";

export default class EffectManager {
    private readonly durations = {
        [EffectTypes.TILE_NORMAL]: 0.5,
        [EffectTypes.ROCKET_VERTICAL]: 0.6,
        [EffectTypes.ROCKET_HORIZONTAL]: 0.6,
        [EffectTypes.BOMB]: 1.0,
        [EffectTypes.MEGA]: 1.2,
    };

    constructor(
        private readonly poolManager: PoolManager,
        private readonly audioManager: AudioManager
    ) {
    }

    public spawnExplosionFX(container: cc.Node, pos: cc.Vec2, fxType: number) {
        const fx = this.poolManager.getEffect(Number(fxType));
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

        const duration = this.durations[fxType] || 1.0;
        cc.Canvas.instance.node.getComponent(cc.Component).scheduleOnce(() => {
            if (cc.isValid(fx)) {
                this.poolManager.putEffect(fx, fxType);
            }
        }, duration);

        this.playExplosionSound(fxType);
    }

    public spawnCrossFX(container: cc.Node, pos: cc.Vec2) {
        this.spawnExplosionFX(container, pos, EffectTypes.ROCKET_VERTICAL);
        this.spawnExplosionFX(container, pos, EffectTypes.ROCKET_HORIZONTAL);
    }

    public shakeCamera() {
        const mainCamera = cc.find("Canvas/Main Camera");
        if (!mainCamera) return;

        cc.tween(mainCamera)
            .by(0.05, {x: 10, y: 10})
            .by(0.05, {x: -20, y: -10})
            .by(0.05, {x: 10, y: 0})
            .call(() => {
                mainCamera.y = 0;
                mainCamera.x = 0;
            })
            .start();
    }

    public showScoreAnimation(worldPos: cc.Vec2, amount: number) {
        const popup = this.poolManager.getScorePopup();
        if (!popup) return;

        const canvas = cc.find("Canvas");
        popup.parent = canvas;
        popup.zIndex = cc.macro.MAX_ZINDEX;

        const localPos = canvas.convertToNodeSpaceAR(worldPos);
        popup.setPosition(localPos);

        const label = popup.getComponent(cc.Label) || popup.getComponentInChildren(cc.Label);
        if (label) {
            label.string = `+${amount}`;
        }

        cc.tween(popup)
            .parallel(
                cc.tween().by(0.8, {y: 150}, {easing: "sineOut"}),
                cc.tween().to(0.8, {opacity: 0})
            )
            .call(() => this.poolManager.putScorePopup(popup))
            .start();
    }

    private playExplosionSound(fxType: number) {
        switch (fxType) {
            case EffectTypes.ROCKET_VERTICAL:
            case EffectTypes.ROCKET_HORIZONTAL:
                this.audioManager.playBlastSpam();
                break;
            case EffectTypes.BOMB:
            case EffectTypes.MEGA:
                this.audioManager.play("booster", {
                    cooldownMs: 120,
                    randomVolume: [0.85, 1.0],
                    randomPitch: [0.94, 1.02],
                });
                break;
            case EffectTypes.TILE_NORMAL:
            default:
                this.audioManager.play("tileExp", {
                    cooldownMs: 45,
                    randomVolume: [0.7, 0.9],
                    randomPitch: [0.98, 1.08],
                });
                break;
        }
    }
}
