import property = cc._decorator.property;
import ccclass = cc._decorator.ccclass;
import {GameState} from "./Enum/GameState";
import DataService from "./DataService";

@ccclass
export default class GameOverWindow extends cc.Component {
    @property(cc.Label) scoreLabel: cc.Label = null;
    @property(cc.Node) panel: cc.Node = null; // Сама панель окна

    onLoad() {
        // Подписка на состояние проигрыша
        DataService.instance.eventTarget.on('state-changed', (state: GameState) => {
            if (state === GameState.LOST) this.show();
        }, this);

        this.panel.active = false;
    }

    show() {
        this.panel.active = true;
        this.scoreLabel.string = `Очки: ${DataService.instance.score}`;

        this.panel.scale = 0.5;
        cc.tween(this.panel)
            .to(0.3, { scale: 1 }, { easing: 'backOut' })
            .start();
    }

    // Привязать в редакторе к кнопке "Заново"
    public onClickRestart() {
        DataService.instance.eventTarget.emit(DataService.EVT_RESTART);
        this.hide();
    }

    // Привязать в редакторе к кнопке "Продолжить"
    public onClickContinue() {
        DataService.instance.eventTarget.emit(DataService.EVT_CONTINUE);
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
