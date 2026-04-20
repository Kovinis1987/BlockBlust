const { ccclass, property } = cc._decorator;

type SfxPlayOptions = {
    cooldownMs?: number;
    volumeScale?: number;
    randomVolume?: [number, number];
    randomPitch?: [number, number];
};

@ccclass
export default class AudioManager extends cc.Component {
    @property({ type: cc.AudioClip }) bgm: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) clickSfx: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) blastSfx: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) boosterSfx: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) tileBlastSfx: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) fallSfx: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) winSfx: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) switchBooster: cc.AudioClip = null;

    private _sfxVolume: number = 1.0;
    private _lastBlastTime: number = 0;
    private _lastPlayByKey: {[key: string]: number} = {};

    onLoad() {
        cc.game.addPersistRootNode(this.node);

        this.scheduleOnce(() => {
            this.playBGM();
        }, 0.1);
    }

    public playBlastSpam() {
        if (!this.blastSfx) return;
        const now = Date.now();
        if (now - this._lastBlastTime > 70) {
            this.play('blast', {
                cooldownMs: 70,
                randomVolume: [0.85, 1.0],
                randomPitch: [0.96, 1.04],
            });
            this._lastBlastTime = now;
        }
    }

    public play(effectName: string, options?: SfxPlayOptions) {
        switch(effectName) {
            case 'blast':
                this.playSFX('blast', this.blastSfx, {
                    cooldownMs: 70,
                    randomVolume: [0.85, 1.0],
                    randomPitch: [0.96, 1.04],
                    ...options,
                });
                break;
            case 'booster':
                this.playSFX('booster', this.boosterSfx, {
                    cooldownMs: 110,
                    randomVolume: [0.9, 1.0],
                    randomPitch: [0.94, 1.03],
                    ...options,
                });
                break;
            case 'tileExp':
                this.playSFX('tileExp', this.tileBlastSfx, {
                    cooldownMs: 45,
                    randomVolume: [0.75, 0.95],
                    randomPitch: [0.98, 1.08],
                    ...options,
                });
                break;
            case 'click':
                this.playSFX('click', this.clickSfx, {
                    cooldownMs: 20,
                    ...options,
                });
                break;
            case 'fall':
                this.playSFX('fall', this.fallSfx, {
                    volumeScale: 0.5,
                    ...options,
                });
                break;
            case 'win':
                this.playSFX('win', this.winSfx, options);
                break;
            case 'switch':
                this.playSFX('switch', this.switchBooster, {
                    cooldownMs: 50,
                    ...options,
                });
                break;
        }
    }

    private playBGM() {
        if (this.bgm) cc.audioEngine.playMusic(this.bgm, true);
    }

    private playSFX(key: string, clip: cc.AudioClip, options?: SfxPlayOptions) {
        if (!clip) return;

        const now = Date.now();
        const cooldownMs = options && options.cooldownMs ? options.cooldownMs : 0;
        const lastPlay = this._lastPlayByKey[key] || 0;
        if (cooldownMs > 0 && now - lastPlay < cooldownMs) {
            return;
        }
        this._lastPlayByKey[key] = now;

        const volumeScale = options && options.volumeScale !== undefined ? options.volumeScale : 1.0;
        let volume = this._sfxVolume * volumeScale;
        if (options && options.randomVolume) {
            volume *= this.randomRange(options.randomVolume[0], options.randomVolume[1]);
        }
        volume = Math.max(0, Math.min(1, volume));

        const audioId = cc.audioEngine.playEffect(clip, false);
        cc.audioEngine.setVolume(audioId, volume);

        if (options && options.randomPitch) {
            const engineAny = cc.audioEngine as any;
            if (engineAny && typeof engineAny.setPlaybackRate === 'function') {
                const rate = this.randomRange(options.randomPitch[0], options.randomPitch[1]);
                engineAny.setPlaybackRate(audioId, rate);
            }
        }
    }

    private randomRange(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }
}
