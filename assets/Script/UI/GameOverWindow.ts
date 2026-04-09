import property = cc._decorator.property;
import ccclass = cc._decorator.ccclass;
import {GameState} from "../Enum/GameState";
import DataService from "../Service/DataService";
import AudioManager from "../Service/AudioManager";
import {registerDefaultServices} from "../Core/registerDefaultServices";
import {appContainer} from "../Core/DiContainer";
import {SERVICE_TOKENS} from "../Core/ServiceTokens";

@ccclass
export default class GameOverWindow extends cc.Component {
    @property(cc.Label) scoreLabel: cc.Label = null;
    @property(cc.Node) panel: cc.Node = null;
    @property(cc.Node) background: cc.Node = null;

    private dataService: DataService;
    private audioManager: AudioManager;

    onLoad() {
        registerDefaultServices();
        this.dataService = appContainer.resolve(SERVICE_TOKENS.dataService);
        this.audioManager = appContainer.resolve(SERVICE_TOKENS.audioManager);

        this.dataService.eventTarget.on(DataService.EVT_STATE_CHANGED, this.onStateChanged, this);
        this.panel.active = false;
    }

    private onStateChanged(state: GameState) {
        if (state === GameState.LOST) {
            this.show();
        }
    }

    show() {
        this.panel.active = true;
        this.background.active = true;
        this.scoreLabel.string = `Очки: ${this.dataService.score}`;
        this.audioManager.play("fall");
        this.panel.scale = 0.5;
        cc.tween(this.panel)
            .to(0.3, {scale: 1}, {easing: "backOut"})
            .start();
    }

    public onClickRestart() {
        this.dataService.restartCurrentLevel();
        this.audioManager.play("click");
        this.hide();
    }

    public onClickContinue() {
        this.dataService.requestContinue();
        this.audioManager.play("click");
        this.hide();
    }

    private hide() {
        cc.tween(this.panel)
            .to(0.2, {scale: 0, opacity: 0})
            .call(() => {
                this.panel.active = false;
                this.panel.opacity = 255;
                if (this.background) {
                    this.background.active = false;
                }
            })
            .start();
    }

    onDestroy() {
        this.dataService.eventTarget.off(DataService.EVT_STATE_CHANGED, this.onStateChanged, this);
    }
}
