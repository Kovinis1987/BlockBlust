import DataService from "./DataService";
import ccclass = cc._decorator.ccclass;
import {GameState} from "./GameState";
import property = cc._decorator.property;

@ccclass
export default class WinWindow extends cc.Component {
    @property(cc.Label) scoreLabel: cc.Label = null;
    @property(cc.Node) panel: cc.Node = null; // Сама панель окна

    onLoad() {
        DataService.instance.eventTarget.on('state-changed', (state: GameState) => {
            if (state === GameState.WON) {
                this.show()
            }
        }, this);
    }

    private show() {
        this.panel.active = true;
        this.scoreLabel.string = `Очки: ${DataService.instance.score}`;

        this.panel.scale = 0.5;
        cc.tween(this.panel)
            .to(0.3, { scale: 1 }, { easing: 'backOut' })
            .start();
    }

    public hide() {
        DataService.instance.nextLevel();
        cc.tween(this.panel)
            .to(0.2, { scale: 0, opacity: 0 })
            .call(() => {
                this.panel.active = false;
                this.panel.opacity = 255;
            })
            .start();
    }
}