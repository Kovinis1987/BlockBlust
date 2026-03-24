const { ccclass, property } = cc._decorator;

@ccclass('GridSettings')
class GridSettings {
    @property({ tooltip: "Отступ слева" }) paddingLeft: number = 35;
    @property({ tooltip: "Отступ снизу" }) paddingBottom: number = 25;
    @property({ tooltip: "Зазор X" }) spacingX: number = 5;
    @property({ tooltip: "Зазор Y" }) spacingY: number = 5;
}

@ccclass('EconomySettings')
class EconomySettings {
    @property({ tooltip: "Очки за обычный тайл" }) scoreTile: number = 10;
    @property({ tooltip: "Очки за бустер" }) scoreBooster: number = 40;
    @property({ tooltip: "Мин. для Ракеты" }) rocketMin: number = 5;
    @property({ tooltip: "Мин. для Бомбы" }) bombMin: number = 7;
    @property({ tooltip: "Мин. для Мега-бомбы" }) megaMin: number = 10;
    @property({ tooltip: "Сколько ходов даем при нажатии Продолжить" }) continueMoves: number = 5;
    @property({ tooltip: "Мин. количество тайлов для матча" }) minMatch: number = 3;
}

@ccclass
export default class GameConfig extends cc.Component {
    @property(GridSettings)
    grid: GridSettings = new GridSettings();

    @property(EconomySettings)
    economy: EconomySettings = new EconomySettings();

    @property({ type: cc.Float, tooltip: "Длительность падения" })
    fallDuration: number = 0.4;

    @property({ type: cc.Float, tooltip: "Задержка волны взрыва" })
    blastWaveDelay: number = 0.02;
}

