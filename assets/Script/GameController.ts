import TileComponent from "./TileComponent";
import PoolManager from "./PoolManager";
import GridModel from "./GridModel";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameController extends cc.Component {
    @property(cc.Node)
    gridContainer: cc.Node = null; // Узел-родитель для тайлов (Layout или просто Node)

    @property(cc.Integer)
    rows: number = 8;

    @property(cc.Integer)
    cols: number = 8;

    @property(cc.Integer)
    tileSizeX: number = 108; // Размер одного тайла с учетом отступа
    @property(cc.Integer)
    tileSizeY: number = 120; // Размер одного тайла с учетом отступа

    private model: GridModel = null;
    private isProcessing: boolean = false; // Блокировка кликов во время анимаций

    onLoad() {
        this.model = new GridModel(this.rows, this.cols);
        this.generateInitialGrid();

        // Подписываемся на глобальное событие клика (или можно вешать на каждый тайл)
        this.node.on(cc.Node.EventType.TOUCH_END, this.handleTouch, this);
    }

    // Создание стартовой сетки
    private generateInitialGrid() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const colorID = Math.floor(Math.random() * 5); // 5 цветов
                this.model.setTile(r, c, colorID);
                this.spawnTile(r, c, colorID);
            }
        }
    }

    // Создание одного тайла визуально
    private spawnTile(r: number, c: number, colorID: number) {
        const tileNode = PoolManager.instance.getTile();
        tileNode.parent = this.gridContainer;

        const pos = this.getScreenPosition(r, c);
        tileNode.setPosition(cc.v3(pos.x, pos.y, 0));

        const comp = tileNode.getComponent(TileComponent);
        comp.init(colorID, r, c);

        // Добавим имя для удобства отладки
        tileNode.name = `Tile_${r}_${c}`;
    }

    // Перевод координат сетки в координаты экрана (от центра gridContainer)
    private getScreenPosition(r: number, c: number): cc.Vec2 {
        const offsetX = (this.cols - 1) * this.tileSizeX / 2;
        const offsetY = (this.rows - 1) * this.tileSizeY / 2;
        return cc.v2(c * this.tileSizeX - offsetX, r * this.tileSizeY - offsetY);
    }

    private handleTouch(event: cc.Event.EventTouch) {
        if (this.isProcessing) return;

        // Определяем, на какой тайл нажали
        const worldPoint = event.getLocation();
        const localPoint = this.gridContainer.convertToNodeSpaceAR(worldPoint);

        // Находим индексы в сетке по координатам клика
        const offsetX = (this.cols - 1) * this.tileSizeX / 2;
        const offsetY = (this.rows - 1) * this.tileSizeY / 2;

        const c = Math.round((localPoint.x + offsetX) / this.tileSizeX);
        const r = Math.round((localPoint.y + offsetY) / this.tileSizeY);

        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
            this.tryBlast(r, c);
        }
    }

    private async tryBlast(r: number, c: number) {
        const group = this.model.findGroup(r, c);

        if (group.length < 2) {
            // Опционально: проиграть анимацию "нельзя"
            return;
        }

        this.isProcessing = true;

        // 1. Удаляем тайлы (Визуал + Модель)
        const nodesToDestroy = this.getNodesByCoords(group);
        this.model.clearCells(group);

        let finishedActions = 0;
        nodesToDestroy.forEach(node => {
            node.getComponent(TileComponent).destroyTile(() => {
                PoolManager.instance.putTile(node);
                finishedActions++;

                // Когда все исчезли — запускаем падение
                if (finishedActions === nodesToDestroy.length) {
                    this.processGridPhysics();
                }
            });
        });
    }

    private processGridPhysics() {
        // 2. Рассчитываем падение в модели
        const movements = this.model.processFalling();

        // 3. Анимируем падение существующих тайлов
        movements.forEach(move => {
            const node = this.getNodeAt(move.from.r, move.from.c);
            if (node) {
                const newPos = this.getScreenPosition(move.to.r, move.to.c);
                node.getComponent(TileComponent).moveTo(move.to.r, move.to.c, newPos);
            }
        });

        // 4. Генерируем новые тайлы сверху
        const news = this.model.fillEmptyCells(); // Метод в модели, который возвращает новые данные
        news.forEach(n => {
            this.spawnTile(n.r, n.c, n.type);
            // Можно добавить анимацию появления сверху
        });

        // Разблокируем клики через небольшую паузу (длительность анимации)
        this.scheduleOnce(() => {
            this.isProcessing = false;
        }, 0.3);
    }

    // Вспомогательные методы поиска узлов на сцене
    private getNodesByCoords(coords: {r:number, c:number}[]): cc.Node[] {
        return this.gridContainer.children.filter(node => {
            const comp = node.getComponent(TileComponent);
            return coords.some(coord => coord.r === comp.gridPos.y && coord.c === comp.gridPos.x);
        });
    }

    private getNodeAt(r: number, c: number): cc.Node {
        return this.gridContainer.children.find(node => {
            const comp = node.getComponent(TileComponent);
            // Внимание: проверь соответствие x/y и r/c
            return comp.gridPos.y === r && comp.gridPos.x === c;
        });
    }
}