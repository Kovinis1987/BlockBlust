import DataService from "../DataService";
import GameController from "../GameController";

const { ccclass, property } = cc._decorator;

@ccclass
export default class BoosterBombButton extends cc.Component {
    @property(cc.Label)
    countLabel: cc.Label = null;

    @property({ type: cc.Color })
    activeColor: cc.Color = cc.Color.RED;

    private _count: number = 0;
    private _isActive: boolean = false;
    private originalColor: cc.Color = null;

    onLoad() {
        this.originalColor = this.node.color.clone();
        this.node.on(cc.Node.EventType.TOUCH_END, this.onActivate, this);

        DataService.instance.eventTarget.on('bomb-changed', (count: number) => {
            this.count = count;
        }, this);
        this.count = DataService.instance.bombBoosters; // Предполагаем, что поле есть
    }

    get count(): number { return this._count; }
    set count(value: number) {
        this._count = value;
        if (this.countLabel) {
            this.countLabel.string = value.toString();
        }
        this.updateVisuals();
    }

    onActivate() {
        if (this._count <= 0) return;

        this._isActive = !this._isActive;
        this.updateVisuals();

        const event = new cc.Event.EventCustom(DataService.EVT_BOOSTER_BOMB, true);
        event.detail = { active: this._isActive };
        this.node.dispatchEvent(event);
        console.log('💣 BoosterBombButton: состояние изменилось на', this._isActive);
    }

    public updateVisuals() {
        if (this._isActive) {
            this.node.color = this.activeColor;
            cc.tween(this.node).to(0.1, { scale: 1.1 }).start();
        } else {
            this.node.color = this.originalColor;
            cc.tween(this.node).to(0.1, { scale: 1.0 }).start();
        }
    }

    public consume() {
        if (this._count > 0) {
            this._count--;
            this.countLabel.string = this._count.toString();
            this._isActive = false;
            this.updateVisuals();
        }
    }
}