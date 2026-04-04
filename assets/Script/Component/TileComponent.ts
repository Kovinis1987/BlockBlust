const { ccclass, property } = cc._decorator;

@ccclass
export default class TileComponent extends cc.Component {

    @property(cc.Sprite)
    sprite: cc.Sprite = null;

    @property([cc.SpriteFrame])
    colors: cc.SpriteFrame[] = [];

    private _type: number = -1;
    private _gridPos: cc.Vec2 = cc.v2(0, 0);
    private _clickHandler: Function = null;

    get type(): number { return this._type; }
    get gridPos(): cc.Vec2 { return this._gridPos; }
    set gridPos(value: cc.Vec2) {
        this._gridPos = value;
    }

    onLoad() {
        // Делаем ноду кликабельной напрямую
        this.node.on(cc.Node.EventType.TOUCH_END, this.onClick, this);
    }

    public init(id: number, r: number, c: number, clickCallback: Function) {
        this._type = id;
        this._gridPos = cc.v2(c, r);
        this._clickHandler = clickCallback;

        // Если это обычный тайл (ID 2-5), меняем цвет
        if (id >= 2 && id <= 5) {
            const spriteIndex = id - 2;
            if (this.colors[spriteIndex]) {
                this.sprite.spriteFrame = this.colors[spriteIndex];
            }
        }
        // Если это бустер (6-9), спрайт уже настроен в префабе, ничего не трогаем

        this.node.scale = 1;
        this.node.opacity = 255;
    }

    private onClick() {
        if (this._clickHandler) {
            this._clickHandler(this._gridPos.y, this._gridPos.x);
        }
    }

    public moveTo(r: number, c: number, targetPos: cc.Vec2, onComplete?: Function) {
        this._gridPos = cc.v2(c, r);
        cc.tween(this.node).stop();
        cc.tween(this.node)
            .to(0.4, { position: cc.v3(targetPos.x, targetPos.y, 0) }, { easing: 'bounceOut' })
            .call(() => {
                if (onComplete) onComplete();
            })
            .start();
    }

    public destroyTile(callback: Function) {
        cc.tween(this.node).stop();
        cc.tween(this.node)
            .to(0.15, { scale: 0, opacity: 0 }, { easing: 'backIn' })
            .call(() => {
                if (callback) callback();
            })
            .start();
    }

    public shake() {
        cc.tween(this.node).stop();
        cc.tween(this.node)
            .by(0.05, { x: 5 })
            .by(0.1, { x: -10 })
            .by(0.05, { x: 5 })
            .start();
    }
}
