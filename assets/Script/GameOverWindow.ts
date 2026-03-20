const { ccclass, property } = cc._decorator;

@ccclass
export default class GameOverWindow extends cc.Component {
    @property(cc.Label)
    scoreLabel: cc.Label = null;

    private _onContinue: Function = null;
    private _onRestart: Function = null;

    show(score: number, onContinue: Function, onRestart: Function) {
        this.node.active = true;
        this.scoreLabel.string = `Очки: ${score}`;
        this._onContinue = onContinue;
        this._onRestart = onRestart;

        // Анимация появления
        this.node.scale = 0.5;
        cc.tween(this.node)
            .to(0.3, { scale: 1 }, { easing: 'backOut' })
            .start();
    }

    // Нажатие на кнопку "Продолжить/Перемешать"
    onClickContinue() {
        if (this._onContinue) this._onContinue();
        this.hide();
    }

    // Нажатие на кнопку "Заново"
    onClickRestart() {
        if (this._onRestart) this._onRestart();
        this.hide();
    }

    private hide() {
        cc.tween(this.node)
            .to(0.2, { scale: 0.5, opacity: 0 })
            .call(() => { this.node.active = false; this.node.opacity = 255; })
            .start();
    }
}
