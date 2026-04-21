import property = cc._decorator.property;
import ccclass = cc._decorator.ccclass;
import {GameState} from "../../gameplay/types/GameState";
import AudioManager from "../../infrastructure/audio/AudioManager";
import GameSessionService from "../../gameplay/session/GameSessionService";
import GameSignals from "../../gameplay/session/GameSignals";
import GameStore from "../../gameplay/session/GameStore";

export interface GameOverWindowDependencies {
    gameSignals: GameSignals;
    gameStore: GameStore;
    gameSessionService: GameSessionService;
    audioManager: AudioManager;
}

@ccclass
export default class GameOverWindow extends cc.Component {
    @property(cc.Label) scoreLabel: cc.Label = null;
    @property(cc.Node) panel: cc.Node = null;
    @property(cc.Node) background: cc.Node = null;

    private gameSignals: GameSignals;
    private gameStore: GameStore;
    private gameSessionService: GameSessionService;
    private audioManager: AudioManager;
    private isTransitioning = false;

    onLoad() {
        this.panel.active = false;
        this.setButtonsInteractable(false);
    }

    public initialize(dependencies: GameOverWindowDependencies): void {
        if (this.gameSignals) {
            this.gameSignals.off(GameSignals.EVT_STATE_CHANGED, this.onStateChanged, this);
        }

        this.gameSignals = dependencies.gameSignals;
        this.gameStore = dependencies.gameStore;
        this.gameSessionService = dependencies.gameSessionService;
        this.audioManager = dependencies.audioManager;
        this.gameSignals.on(GameSignals.EVT_STATE_CHANGED, this.onStateChanged, this);
    }

    private onStateChanged(state: GameState) {
        if (state === GameState.LOST) {
            this.show();
        }
    }

    show() {
        cc.Tween.stopAllByTarget(this.panel);
        this.isTransitioning = true;
        this.setButtonsInteractable(false);
        this.panel.active = true;
        this.background.active = true;
        this.panel.opacity = 255;
        this.scoreLabel.string = `Очки: ${this.gameStore.score}`;
        this.audioManager.play("fall");
        this.panel.scale = 0.5;
        cc.tween(this.panel)
            .to(0.3, {scale: 1}, {easing: "backOut"})
            .call(() => {
                this.isTransitioning = false;
                this.setButtonsInteractable(true);
            })
            .start();
    }

    public onClickRestart() {
        if (this.isTransitioning) {
            return;
        }

        this.gameSessionService.requestRestart();
        this.audioManager.play("click");
        this.hide();
    }

    public onClickContinue() {
        if (this.isTransitioning) {
            return;
        }

        this.gameSessionService.requestContinue();
        this.audioManager.play("click");
        this.hide();
    }

    private hide() {
        cc.Tween.stopAllByTarget(this.panel);
        this.isTransitioning = true;
        this.setButtonsInteractable(false);
        cc.tween(this.panel)
            .to(0.2, {scale: 0, opacity: 0})
            .call(() => {
                this.panel.active = false;
                this.panel.opacity = 255;
                this.isTransitioning = false;
                if (this.background) {
                    this.background.active = false;
                }
            })
            .start();
    }

    private setButtonsInteractable(interactable: boolean) {
        const buttons = this.panel.getComponentsInChildren(cc.Button);
        buttons.forEach((button) => {
            button.interactable = interactable;
        });
    }

    onDestroy() {
        if (!this.gameSignals) {
            return;
        }

        this.gameSignals.off(GameSignals.EVT_STATE_CHANGED, this.onStateChanged, this);
    }
}
