import ccclass = cc._decorator.ccclass;
import property = cc._decorator.property;
import {GameState} from "../../Gameplay/Types/GameState";
import AudioManager from "../../Infrastructure/Audio/AudioManager";
import GameSessionService from "../../Gameplay/Session/GameSessionService";
import GameSignals from "../../Gameplay/Session/GameSignals";
import GameStore from "../../Gameplay/Session/GameStore";
import {registerDefaultServices} from "../../Core/registerDefaultServices";
import {appContainer} from "../../Core/DiContainer";
import {SERVICE_TOKENS} from "../../Core/ServiceTokens";

@ccclass
export default class WinWindow extends cc.Component {
    @property(cc.Label) scoreLabel: cc.Label = null;
    @property(cc.Node) panel: cc.Node = null;
    @property(cc.Node) background: cc.Node = null;

    private gameSignals: GameSignals;
    private gameStore: GameStore;
    private gameSessionService: GameSessionService;
    private audioManager: AudioManager;

    onLoad() {
        registerDefaultServices();
        this.gameSignals = appContainer.resolve(SERVICE_TOKENS.gameSignals);
        this.gameStore = appContainer.resolve(SERVICE_TOKENS.gameStore);
        this.gameSessionService = appContainer.resolve(SERVICE_TOKENS.gameSessionService);
        this.audioManager = appContainer.resolve(SERVICE_TOKENS.audioManager);

        this.gameSignals.on(GameSignals.EVT_STATE_CHANGED, this.onStateChanged, this);
        this.panel.active = false;
    }

    private onStateChanged(state: GameState) {
        if (state === GameState.WIN) {
            this.show();
            this.audioManager.play("win");
        }
    }

    private show() {
        this.panel.active = true;
        this.background.active = true;
        this.scoreLabel.string = `Очки: ${this.gameStore.score}`;

        this.panel.scale = 0.5;
        cc.tween(this.panel)
            .to(0.3, {scale: 1}, {easing: "backOut"})
            .start();
    }

    public hide() {
        this.audioManager.play("click");
        this.gameSessionService.goToNextLevel();

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
        this.gameSignals.off(GameSignals.EVT_STATE_CHANGED, this.onStateChanged, this);
    }
}
