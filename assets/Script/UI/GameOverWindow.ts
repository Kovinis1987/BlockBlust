import property = cc._decorator.property;
import ccclass = cc._decorator.ccclass;
import {GameState} from "../Enum/GameState";
import DataService from "../Service/DataService";
import AudioManager from "../Service/AudioManager";

@ccclass
export default class GameOverWindow extends cc.Component {
    @property(cc.Label) scoreLabel: cc.Label = null;
    @property(cc.Node) panel: cc.Node = null;
    @property(cc.Node) background: cc.Node = null;

    onLoad() {
        DataService.instance.eventTarget.on(DataService.EVT_STATE_CHANGED, (state: GameState) => {
            if (state === GameState.LOST) this.show();
        }, this);

        this.panel.active = false;
    }

    show() {
        this.panel.active = true;
        this.background.active = true;
        this.scoreLabel.string = `Очки: ${DataService.instance.score}`;
        AudioManager.instance.play("fall");
        this.panel.scale = 0.5;
        cc.tween(this.panel)
            .to(0.3, { scale: 1 }, { easing: 'backOut' })
            .start();
    }

    public onClickRestart() {
        DataService.instance.eventTarget.emit(DataService.EVT_RESTART);
        AudioManager.instance.play("click");
        this.hide();
    }

    public onClickContinue() {
        DataService.instance.eventTarget.emit(DataService.EVT_CONTINUE);
        AudioManager.instance.play("click");
        this.hide();
    }

    private hide() {
        cc.tween(this.panel)
            .to(0.2, { scale: 0, opacity: 0 })
            .call(() => {
                this.panel.active = false;
                this.panel.opacity = 255;
            })
            .start();
    }
}
