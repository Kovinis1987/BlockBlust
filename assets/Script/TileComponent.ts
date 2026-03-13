const { ccclass, property } = cc._decorator;

@ccclass
export default class TileComponent extends cc.Component {
    @property(cc.Sprite)
    sprite: cc.Sprite = null;

    @property([cc.SpriteFrame])
    colors: cc.SpriteFrame[] = []; // Закинь сюда спрайты разных цветов в инспекторе

    private _type: number = -1;
    private _gridPos: cc.Vec2 = cc.v2(0, 0);

    // Свойства для доступа извне
    get type(): number { return this._type; }
    get gridPos(): cc.Vec2 { return this._gridPos; }

    /**
     * Инициализация тайла
     * @param type ID цвета
     * @param x координата в сетке
     * @param y координата в сетке
     */
    public init(type: number, x: number, y: number) {
        this._type = type;
        this._gridPos = cc.v2(x, y);

        // Устанавливаем спрайт согласно типу
        if (this.colors[type]) {
            this.sprite.spriteFrame = this.colors[type];
        }
    }

    public moveTo(newX: number, newY: number, worldPos: cc.Vec2) {
        this._gridPos = cc.v2(newX, newY);

        cc.tween(this.node)
            // Используем cc.v3, чтобы избежать ошибки TS2741
            .to(0.2, { position: cc.v3(worldPos.x, worldPos.y, 0) }, { easing: 'sineOut' })
            .start();
    }

    public getCoord() {

    }

    /**
     * Эффект при клике (если группа меньше 2)
     */
    public shake() {
        cc.tween(this.node)
            .by(0.05, { x: 5 })
            .by(0.1, { x: -10 })
            .by(0.05, { x: 5 })
            .start();
    }

    /**
     * Анимация исчезновения
     */
    public destroyTile(callback: Function) {
        cc.tween(this.node)
            .to(0.15, { scale: 0, opacity: 0 }, { easing: 'backIn' })
            .call(() => {
                // Сбрасываем состояние для NodePool
                this.node.scale = 1;
                this.node.opacity = 255;
                callback();
            })
            .start();
    }
}