const {ccclass, property} = cc._decorator;

@ccclass("GridSettings")
class GridSettings {
    @property({tooltip: "Отступ слева"})
    paddingLeft: number = 35;

    @property({tooltip: "Отступ снизу"})
    paddingBottom: number = 25;

    @property({tooltip: "Зазор по X"})
    spacingX: number = 5;

    @property({tooltip: "Зазор по Y"})
    spacingY: number = 5;
}

@ccclass("EconomySettings")
class EconomySettings {
    @property({tooltip: "Очки за обычный тайл"})
    scoreTile: number = 10;

    @property({tooltip: "Минимум тайлов для ракеты"})
    rocketMin: number = 5;

    @property({tooltip: "Минимум тайлов для бомбы"})
    bombMin: number = 7;

    @property({tooltip: "Минимум тайлов для мега-бомбы"})
    megaMin: number = 10;

    @property({tooltip: "Сколько ходов даёт кнопка Продолжить"})
    continueMoves: number = 5;

    @property({tooltip: "Минимальный размер группы для взрыва"})
    minMatch: number = 3;
}

@ccclass("AnimationsSettings")
class AnimationsSettings {
    @property({type: cc.Float, tooltip: "Задержка волны взрыва"})
    blastWaveDelay: number = 0.02;
}

@ccclass("BoosterSettings")
class BoosterSettings {
    @property({type: cc.Integer, tooltip: "Радиус взрыва бомбы в клетках"})
    bombRadius: number = 3;
}

@ccclass
export default class GameConfig extends cc.Component {
    @property(GridSettings)
    grid: GridSettings = new GridSettings();

    @property(EconomySettings)
    economy: EconomySettings = new EconomySettings();

    @property(AnimationsSettings)
    animations: AnimationsSettings = new AnimationsSettings();

    @property(BoosterSettings)
    boosters: BoosterSettings = new BoosterSettings();
}
