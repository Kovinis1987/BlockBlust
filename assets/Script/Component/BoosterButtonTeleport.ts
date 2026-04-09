import {GameState} from "../Enum/GameState";
import AudioManager from "../Service/AudioManager";
import DataService from "../Service/DataService";
import {registerDefaultServices} from "../Core/registerDefaultServices";
import {appContainer} from "../Core/DiContainer";
import {SERVICE_TOKENS} from "../Core/ServiceTokens";

const {ccclass, property} = cc._decorator;

@ccclass
export default class BoosterButtonTeleport extends cc.Component {
    @property(cc.Label)
    countLabel: cc.Label = null;

    @property({type: cc.Color})
    activeColor: cc.Color = cc.Color.YELLOW;

    private _isActive: boolean = false;
    private originalColor: cc.Color = null;
    private dataService: DataService;
    private audioManager: AudioManager;

    onLoad() {
        registerDefaultServices();
        this.dataService = appContainer.resolve(SERVICE_TOKENS.dataService);
        this.audioManager = appContainer.resolve(SERVICE_TOKENS.audioManager);

        this.originalColor = this.node.color.clone();
        this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);

        this.dataService.eventTarget.on(DataService.EVT_TELEPORT_CHANGED, this.onCountChanged, this);
        this.dataService.eventTarget.on(DataService.EVT_STATE_CHANGED, this.onStateChanged, this);

        this.onCountChanged(this.dataService.teleportBoosters);
        this.onStateChanged(this.dataService.gameState);
    }

    private onClick() {
        if (this.dataService.teleportBoosters <= 0) return;

        this.audioManager.play("click");

        const event = new cc.Event.EventCustom(DataService.EVT_BOOSTER_TELEPORT, true);
        event.detail = {active: this.dataService.gameState !== GameState.BOOSTER_TELEPORT};
        this.node.dispatchEvent(event);
    }

    private onCountChanged(count: number) {
        if (this.countLabel) {
            this.countLabel.string = count.toString();
        }
    }

    private onStateChanged(state: GameState) {
        this._isActive = state === GameState.BOOSTER_TELEPORT;
        this.updateVisuals();
    }

    public updateVisuals() {
        if (this._isActive) {
            this.node.color = this.activeColor;
            cc.tween(this.node).to(0.1, {scale: 1.1}).start();
        } else {
            this.node.color = this.originalColor;
            cc.tween(this.node).to(0.1, {scale: 1.0}).start();
        }
    }

    onDestroy() {
        this.dataService.eventTarget.off(DataService.EVT_TELEPORT_CHANGED, this.onCountChanged, this);
        this.dataService.eventTarget.off(DataService.EVT_STATE_CHANGED, this.onStateChanged, this);
    }
}
