import ccclass = cc._decorator.ccclass;
import property = cc._decorator.property;
import {GameState} from "../../gameplay/types/GameState";
import AudioManager from "../../infrastructure/audio/AudioManager";
import GameSessionService from "../../gameplay/session/GameSessionService";
import GameSignals from "../../gameplay/session/GameSignals";
import GameStore from "../../gameplay/session/GameStore";

export interface WinWindowDependencies {
    gameSignals: GameSignals;
    gameStore: GameStore;
    gameSessionService: GameSessionService;
    audioManager: AudioManager;
}

@ccclass
export default class WinWindow extends cc.Component {
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

    public initialize(dependencies: WinWindowDependencies): void {
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
        if (state === GameState.WIN) {
            this.show();
            this.audioManager.play("win");
        }
    }

    private show() {
        cc.Tween.stopAllByTarget(this.panel);
        this.isTransitioning = true;
        this.setButtonsInteractable(false);
        this.panel.active = true;
        this.background.active = true;
        this.panel.opacity = 255;
        this.scoreLabel.string = `Очки: ${this.gameStore.score}`;

        this.panel.scale = 0.5;
        cc.tween(this.panel)
            .to(0.3, {scale: 1}, {easing: "backOut"})
            .call(() => {
                this.isTransitioning = false;
                this.setButtonsInteractable(true);
            })
            .start();
    }

    public hide() {
        if (this.isTransitioning) {
            return;
        }

        this.audioManager.play("click");
        this.gameSessionService.goToNextLevel();

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
