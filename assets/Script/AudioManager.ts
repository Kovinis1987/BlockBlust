const { ccclass, property } = cc._decorator;

@ccclass
export default class AudioManager extends cc.Component {
    private static _instance: AudioManager = null;
    public static get instance(): AudioManager { return this._instance; }

    @property({ type: cc.AudioClip }) bgm: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) clickSfx: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) blastSfx: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) boosterSfx: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) fallSfx: cc.AudioClip = null;
    @property({ type: cc.AudioClip }) winSfx: cc.AudioClip = null;

    private _sfxVolume: number = 1.0;
    private _lastBlastTime: number = 0;

    onLoad() {
        AudioManager._instance = this;
        cc.game.addPersistRootNode(this.node); // Делаем его неубиваемым между сценами
        this.playBGM();
    }

    public playBlastSpam() {
        if (!this.blastSfx) return; // Защита
        let now = Date.now();
        if (now - this._lastBlastTime > 50) {
            this.play('blast');
            this._lastBlastTime = now;
        }
    }

    public playBGM() {
        if (this.bgm) cc.audioEngine.playMusic(this.bgm, true);
    }

    public playSFX(clip: cc.AudioClip, volumeScale: number = 1.0) {
        if (!clip) return;
        cc.audioEngine.playEffect(clip, false);
    }

    // Сеньорская фишка: проигрывание по имени (строке), чтобы не таскать ссылки везде
    public play(effectName: string) {
        switch(effectName) {
            case 'blast': this.playSFX(this.blastSfx); break;
            case 'booster': this.playSFX(this.boosterSfx); break;
            case 'click': this.playSFX(this.clickSfx); break;
            case 'fall': this.playSFX(this.fallSfx, 0.5); break;
            case 'win': this.playSFX(this.winSfx); break;
        }
    }
}
