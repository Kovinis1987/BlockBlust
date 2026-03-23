import GridModel from "./GridModel";
import TileComponent from "./TileComponent";
import PoolManager from "./PoolManager";
import GameOverWindow from "./GameOverWindow";
import DataService from "./DataService";
import {GameState} from "./GameState";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameController extends cc.Component {
    @property(cc.Node)
    gridContainer: cc.Node = null;

    @property(cc.Integer)
    currentLevel: number = 0;

    @property(GameOverWindow)
    gameOverWindow: GameOverWindow = null;

    @property(cc.Prefab)
    scorePopupPrefab: cc.Prefab = null;

    @property(cc.Prefab)
    obstaclePrefab: cc.Prefab = null;


    private model: GridModel = null;
    private isProcessing: boolean = false;
    private tileSizeX: number = 100;
    private tileSizeY: number = 112;

    private _currentRows: number = 8;
    private _currentCols: number = 8;
    private data: DataService;

    onLoad() {
        this.data = DataService.instance;
        this.loadLevelConfig();
        this.node.on(cc.Node.EventType.TOUCH_END, this.handleTouch, this);
        this.data.eventTarget.on(DataService.EVT_RESTART, this.restartLevel, this);
        this.data.eventTarget.on(DataService.EVT_CONTINUE, this.handleContinue, this);
    }

    private loadLevelConfig() {
        cc.resources.load('configs/levels', cc.JsonAsset, (err, res: cc.JsonAsset) => {
            let data;
            if (err || !res.json || !res.json[this.currentLevel]) {
                cc.warn("Level not found. Using defaults...");
                data = { rows: 9, cols: 9, moves: 25, targetScore: 1500, tiles: null };
            } else {
                data = res.json[this.currentLevel];
            }

            this.data.resetLevel(
                this.currentLevel,
                data.moves || 25,
                data.targetScore || 1500
            );

            this.setupGame(data.rows, data.cols, data.tiles);
        });
    }

    private setupGame(rows: number, cols: number, tilesData: number[] | null) {
        this._currentRows = rows;
        this._currentCols = cols;
        this.model = new GridModel(rows, cols);

        // 1. Очистка и подготовка
        this.gridContainer.removeAllChildren();

        // ВАЖНО: Убедись, что tileSizeX/Y не 0!
        if (this.tileSizeX <= 0) this.tileSizeX = 100;
        if (this.tileSizeY <= 0) this.tileSizeY = 112;

        // 2. Адаптируем масштаб ПЕРЕД спавном
        this.adaptGridScale();

        const layout = this.gridContainer.getComponent(cc.Layout);
        if (layout) {
            layout.enabled = true;
            layout.type = cc.Layout.Type.GRID;
            layout.resizeMode = cc.Layout.ResizeMode.CONTAINER;
            // Настраиваем размеры ячеек прямо из кода для надежности
            layout.cellSize = cc.size(this.tileSizeX, this.tileSizeY);
        }

        // 3. Спавним ноды. Пока Layout включен, setPosition в spawnTile будет игнорироваться,
        // но Layout сам расставит их в сетку.
        this.spawnWithJuice(rows, cols, tilesData);
    }

    private async spawnWithJuice(rows: number, cols: number, tilesData: number[] | null) {
        if (!this.model) {
            cc.error("Ошибка: GridModel не инициализирована!");
            return;
        }

        this.isProcessing = true; // Блокируем ввод на время анимации

        // 1. Включаем Layout для автоматической расстановки в сетку
        const layout = this.gridContainer.getComponent(cc.Layout);
        if (layout) {
            layout.enabled = true;
            // Настраиваем сетку: заполнение сверху вниз (Header), слева направо
            layout.type = cc.Layout.Type.GRID;
            layout.startAxis = cc.Layout.AxisDirection.HORIZONTAL;
            layout.cellSize = cc.size(this.tileSizeX, this.tileSizeY);
        }

        // 2. Итерируем циклом.
        // Чтобы Layout заполнил сетку правильно (сверху вниз),
        // идем от верхнего ряда (rows-1) к нижнему (0)
        for (let r = rows - 1; r >= 0; r--) {
            for (let c = 0; c < cols; c++) {

                // ИНВЕРСИЯ: В редакторе (0,0) - это левый верх.
                // В массиве tilesData индекс 0 — это верхний ряд.
                // Поэтому для r = rows-1 (верх игры) мы берем начало массива.
                const dataIdx = (rows - 1 - r) * cols + c;
                const rawValue = tilesData ? tilesData[dataIdx] : 0;

                let finalID: number;
                if (rawValue === 1) {
                    finalID = 1; // Препятствие
                } else if (rawValue === 0) {
                    finalID = Math.floor(Math.random() * 4) + 2;
                } else {
                    finalID = rawValue; // Фиксированный цвет из редактора
                }

                // Записываем в логическую модель
                this.model.setTile(r, c, finalID);

                // Создаем визуальную ноду
                let node: cc.Node;
                if (finalID === 1) {
                    node = this.spawnObstacle(r, c);
                } else {
                    node = this.spawnTile(r, c, finalID);
                }

                // 3. Анимация "сочности" (выпрыгивание)
                if (node) {
                    node.scale = 0;
                    // Задержка появления зависит от позиции, чтобы была "волна"
                    const delay = ((rows - 1 - r) * cols + c) * 0.01;

                    cc.tween(node)
                        .delay(delay)
                        .to(0.3, { scale: 1 }, { easing: 'backOut' })
                        .start();
                }
            }
        }

        // 4. Финальный аккорд: ждем пока Layout всё расставит и выключаем его
        const totalDuration = (rows * cols * 0.01) + 0.3;

        this.scheduleOnce(() => {
            if (layout) {
                layout.updateLayout(); // Принудительно вычисляем позиции прямо сейчас
                layout.enabled = false; // ВЫКЛЮЧАЕМ, чтобы ноды могли падать вниз (гравитация)
            }

            this.isProcessing = false; // Разблокируем игру
            console.log("Уровень успешно загружен и анимирован!");
        }, totalDuration);
    }


    private spawnTile(r: number, c: number, colorID: number) : cc.Node {
        const tileNode = PoolManager.instance.getTile();
        tileNode.parent = this.gridContainer;

        const pos = this.getScreenPosition(r, c);
        tileNode.setPosition(cc.v3(pos.x, pos.y, 0));

        const comp = tileNode.getComponent(TileComponent);
        comp.init(colorID, r, c, (row, col) => this.tryBlast(row, col));
        return tileNode;
    }

    private getScreenPosition(r: number, c: number): cc.Vec2 {
        // В сетке Layout (при Resize Container) координаты считаются от левого верхнего угла.
        // Чтобы получить Vec2 относительно центра (Anchor 0.5), используем простую логику:
        const totalW = this._currentCols * this.tileSizeX;
        const totalH = this._currentRows * this.tileSizeY;

        const x = (c * this.tileSizeX) - (totalW / 2) + (this.tileSizeX / 2);
        const y = (r * this.tileSizeY) - (totalH / 2) + (this.tileSizeY / 2);

        return cc.v2(x, y);
    }

    private handleTouch(event: cc.Event.EventTouch) {
        if (this.isProcessing || !this.model) return;

        const worldPoint = event.getLocation();
        const localPoint = this.gridContainer.convertToNodeSpaceAR(worldPoint);

        const totalWidth = this._currentCols * this.tileSizeX;
        const totalHeight = this._currentRows * this.tileSizeY;

        const relativeX = localPoint.x + totalWidth / 2;
        const relativeY = localPoint.y + totalHeight / 2;

        const c = Math.floor(relativeX / this.tileSizeX);
        const r = Math.floor(relativeY / this.tileSizeY);

        if (r >= 0 && r < this._currentRows && c >= 0 && c < this._currentCols) {
            console.log(`Clicked on: row ${r}, col ${c}`); // Для отладки
            this.tryBlast(r, c);
        }
    }

    private adaptGridScale() {
        // Допустим, ширина экрана 720, а мы хотим оставить отступы по 40px с боков
        const maxW = cc.winSize.width - 80;
        // Оставляем место под UI сверху и снизу (примерно 400px)
        const maxH = cc.winSize.height - 450;

        const gridW = this._currentCols * this.tileSizeX;
        const gridH = this._currentRows * this.tileSizeY;

        const scaleX = maxW / gridW;
        const scaleY = maxH / gridH;

        // Выбираем минимальный коэффициент, чтобы влезло везде, но не больше 1.0
        let finalScale = Math.min(scaleX, scaleY, 1);

        this.gridContainer.scale = finalScale;

        // Сочность: добавим появление самого контейнера
        this.gridContainer.opacity = 0;
        cc.tween(this.gridContainer)
            .to(0.3, { opacity: 255 })
            .start();
    }

    private shakeCamera() {
        const mainCanvas = cc.find("Canvas");
        cc.tween(mainCanvas)
            .by(0.05, { x: 5, y: 5 })
            .by(0.05, { x: -10, y: -10 })
            .by(0.05, { x: 5, y: 5 })
            .start();
    }

    private tryBlast(r: number, c: number) {
        if (this.isProcessing || this.data.gameState !== GameState.PLAYING) return;

        const group = this.model.findGroup(r, c);
        if (group.length < 3) {
            this.getNodeAt(r, c).getComponent(TileComponent).shake();
            return;
        }

        const points = group.length * 10;

        const tileNode = this.getNodeAt(r, c);
        if (tileNode) {
            const worldPos = tileNode.parent.convertToWorldSpaceAR(tileNode.getPosition());
            this.showScoreAnimation(worldPos, points);
        }

        this.data.useMove();
        this.data.addScore(points);

        this.isProcessing = true;
        const nodesToDestroy = this.getNodesByCoords(group);
        this.model.clearCells(group);

        let count = 0;
        nodesToDestroy.forEach(node => {
            node.getComponent(TileComponent).destroyTile(() => {
                PoolManager.instance.putTile(node);
                count++;
                if (count === nodesToDestroy.length) {
                    this.processGridPhysics();
                    // После падения проверяем, остались ли ходы
                    this.scheduleOnce(() => this.checkPossibleMoves(), 0.5);
                }
            });
        });
    }

    private handleContinue() {
        this.data.resetLevel(
            this.currentLevel,
            this.data.moves + 5,
            this.data.score
        );

        this.data.setGameState(GameState.PLAYING);

        if (!this.model.hasAvailableMoves(3)) {
            this.shuffleGrid();
        }
    }

    private restartLevel() {
        this.gridContainer.removeAllChildren();
        this.loadLevelConfig();
        this.isProcessing = false;
    }

    private checkPossibleMoves() {
        if (!this.model.hasAvailableMoves(3)) {
            if (this.data.useShuffle()) {
                this.shuffleGrid();
            } else {
                this.data.setGameState(GameState.LOST);
            }
        }
    }

    private shuffleGrid() {
        this.model.shuffleOnlyColors();
        this.gridContainer.children.forEach(node => {
            const comp = node.getComponent(TileComponent);
            const newType = this.model.getTile(comp.gridPos.y, comp.gridPos.x);
            comp.init(newType, comp.gridPos.y, comp.gridPos.x, (r, c) => this.tryBlast(r, c));
        });
    }

    private processGridPhysics() {
        const movements = this.model.processFalling();
        movements.forEach(move => {
            const node = this.getNodeAt(move.from.r, move.from.c);
            if (node) {
                const newPos = this.getScreenPosition(move.to.r, move.to.c);
                node.getComponent(TileComponent).moveTo(move.to.r, move.to.c, newPos);
            }
        });

        const news = this.model.fillEmptyCells();
        news.forEach(n => {
            const tileNode = PoolManager.instance.getTile();
            tileNode.parent = this.gridContainer;

            const finalPos = this.getScreenPosition(n.r, n.c);
            const startY = (this._currentRows * this.tileSizeY / 2) + (n.r + 1) * 50;
            tileNode.setPosition(cc.v3(finalPos.x, startY, 0));

            const comp = tileNode.getComponent(TileComponent);
            comp.init(n.type, n.r, n.c, (row, col) => this.tryBlast(row, col));
            comp.moveTo(n.r, n.c, finalPos);
        });

        this.scheduleOnce(() => { this.isProcessing = false; }, 0.4);
    }

    private getNodesByCoords(coords: {r:number, c:number}[]): cc.Node[] {
        return this.gridContainer.children.filter(node => {
            const comp = node.getComponent(TileComponent);
            if (!comp) return false; // Пропускаем препятствия

            const cp = comp.gridPos;
            return coords.some(c => c.r === cp.y && c.c === cp.x);
        });
    }

    private getNodeAt(r: number, c: number): cc.Node {
        return this.gridContainer.children.find(node => {
            const comp = node.getComponent(TileComponent);
            // Если это не тайл (например, препятствие), пропускаем
            if (!comp) return false;
            return comp.gridPos.y === r && comp.gridPos.x === c;
        });
    }

    private spawnObstacle(r: number, c: number): cc.Node {
        const node = cc.instantiate(this.obstaclePrefab);
        node.parent = this.gridContainer;

        // Мы выключили Layout, поэтому ставим позицию вручную
        const pos = this.getScreenPosition(r, c);
        node.setPosition(pos.x, pos.y);

        return node;
    }

    private showScoreAnimation(worldPos: cc.Vec2, amount: number) {
        if (!this.scorePopupPrefab) return;

        const popup = cc.instantiate(this.scorePopupPrefab);
        cc.director.getScene().getChildByName('Canvas').addChild(popup);

        const localPos = popup.parent.convertToNodeSpaceAR(worldPos);
        popup.setPosition(localPos);
        popup.active = true;

        const label = popup.getComponent(cc.Label) || popup.getComponentInChildren(cc.Label);
        if (label) label.string = `+${amount}`;

        cc.tween(popup)
            .parallel(
                cc.tween().by(0.8, { y: 150 }, { easing: 'sineOut' }),
                cc.tween().to(0.8, { opacity: 0 })
            )
            .removeSelf()
            .start();
    }
}
