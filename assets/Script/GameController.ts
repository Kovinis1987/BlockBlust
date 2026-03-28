import GridModel from "./GridModel";
import TileComponent from "./TileComponent";
import PoolManager from "./PoolManager";
import GameOverWindow from "./GameOverWindow";
import DataService from "./DataService";
import {GameState} from "./GameState";
import GameConfig from "./GameConfig";
import AudioManager from "./AudioManager";

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

    @property(GameConfig)
    config: GameConfig = null;


    private model: GridModel = null;
    private isProcessing: boolean = false;
    private tileSizeX: number = 100;
    private tileSizeY: number = 112;

    private _currentRows: number = 8;
    private _currentCols: number = 8;
    private _activeExplosionsCount: number = 0;

    private data: DataService;

    onLoad() {
        this.data = DataService.instance;
        this.loadLevelConfig();
        this.node.on(cc.Node.EventType.TOUCH_END, this.handleTouch, this);
        this.data.eventTarget.on(DataService.EVT_RESTART, this.restartLevel, this);
        this.data.eventTarget.on(DataService.EVT_CONTINUE, this.handleContinue, this);
        DataService.instance.eventTarget.on(DataService.EVT_NEXT_LEVEL, this.loadLevelConfig, this);
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
        this.setupGridSize(rows, cols);
        this.model = new GridModel(rows, cols, this.config);

        // 1. Очистка и подготовка
        this.gridContainer.removeAllChildren();

        // ВАЖНО: Убедись, что tileSizeX/Y не 0!
        if (this.tileSizeX <= 0) this.tileSizeX = 100;
        if (this.tileSizeY <= 0) this.tileSizeY = 112;

        this.adaptGridScale();
        this.setupGridSize(rows, cols);

        // 3. Спавним ноды. Пока Layout включен, setPosition в spawnTile будет игнорироваться,
        // но Layout сам расставит их в сетку.
        this.spawnWithJuice(rows, cols, tilesData);
    }

    private async spawnWithJuice(rows: number, cols: number, tilesData: number[] | null) {
        if (!this.model) return;

        this.isProcessing = true;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Вычисляем индекс для данных (сверху вниз)
                const dataIdx = (rows - 1 - r) * cols + c;
                const rawValue = tilesData ? tilesData[dataIdx] : 0;

                let node: cc.Node = null;
                // Считаем целевую позицию для этой ячейки
                const targetPos = this.getScreenPosition(r, c);

                if (rawValue === 1) {
                    this.model.setTile(r, c, 1);
                    node = this.spawnObstacle(r, c);
                    // Убедись, что внутри spawnObstacle вызывается setPosition(targetPos)
                } else if (rawValue >= 6 && rawValue <= 9) {
                    this.model.setTile(r, c, rawValue);
                    node = PoolManager.instance.getBooster(rawValue);
                    node.parent = this.gridContainer;

                    // УСТАНАВЛИВАЕМ ПОЗИЦИЮ ВРУЧНУЮ (т.к. Layout нет)
                    node.setPosition(targetPos.x, targetPos.y);

                    const comp = node.getComponent(TileComponent);
                    comp.init(rawValue, r, c, (row, col) => this.activateBooster(row, col, rawValue));
                } else {
                    const colorID = rawValue === 0 ? Math.floor(Math.random() * 4) + 2 : rawValue;
                    this.model.setTile(r, c, colorID);
                    node = this.spawnTile(r, c, colorID);
                    // Убедись, что внутри spawnTile вызывается setPosition(targetPos)
                }

                if (node) {
                    node.scale = 0;
                    // Задержка появления: нижние ряды чуть быстрее верхних
                    const delay = (r * 0.05) + (c * 0.01);
                    cc.tween(node)
                        .delay(delay)
                        .to(0.3, { scale: 1 }, { easing: 'backOut' })
                        .start();
                }
            }
        }

        this.scheduleOnce(() => {
            this.isProcessing = false;
        }, 0.5);
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

    private spawnObstacle(r: number, c: number): cc.Node {
        const node = cc.instantiate(this.obstaclePrefab);
        node.parent = this.gridContainer;
        const pos = this.getScreenPosition(r, c);
        node.setPosition(pos.x, pos.y);
        return node;
    }

    private spawnBooster(r: number, c: number, type: number) {
        this.model.setTile(r, c, type);
        const node = PoolManager.instance.getBooster(type); // В пуле сделай метод под разные ID
        node.parent = this.gridContainer;
        node.setPosition(this.getScreenPosition(r, c));

        const comp = node.getComponent(TileComponent);
        comp.init(type, r, c, (row, col) => this.activateBooster(row, col, type));
    }

    private getScreenPosition(r: number, c: number): cc.Vec2 {
        const g = this.config.grid;
        const gridW = this.gridContainer.width;
        const gridH = this.gridContainer.height;

        const x = -gridW / 2 + g.paddingLeft + (c * (this.tileSizeX + g.spacingX)) + (this.tileSizeX / 2);
        const y = -gridH / 2 + g.paddingBottom + (r * (this.tileSizeY + g.spacingY)) + (this.tileSizeY / 2);

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
            this.tryBlast(r, c);
        }
    }

    private adaptGridScale() {
        const maxW = cc.winSize.width - 80;
        const maxH = cc.winSize.height - 450;
        const gridW = this._currentCols * this.tileSizeX;
        const gridH = this._currentRows * this.tileSizeY;
        const scaleX = maxW / gridW;
        const scaleY = maxH / gridH;
        this.gridContainer.scale = Math.min(scaleX, scaleY, 1);
        this.gridContainer.opacity = 0;
        cc.tween(this.gridContainer)
            .to(0.3, { opacity: 255 })
            .start();
    }

    private setupGridSize(rows: number, cols: number) {
        // Удали или выключи компонент Layout в инспекторе навсегда
        const pLeft = 35, pRight = 35, pTop = 25, pBottom = 25;
        const spacingX = 4, spacingY = 4;

        const totalW = pLeft + pRight + (cols * this.tileSizeX) + ((cols - 1) * spacingX);
        const totalH = pTop + pBottom + (rows * this.tileSizeY) + ((rows - 1) * spacingY);

        this.gridContainer.setContentSize(totalW, totalH);
    }

    private tryBlast(r: number, c: number) {
        if (this.isProcessing || this.data.gameState !== GameState.PLAYING) return;

        const group = this.model.findGroup(r, c);
        if (group.length < 3) {
            this.getNodeAt(r, c).getComponent(TileComponent).shake();
            return;
        }
        AudioManager.instance.play('click');

        const boosterData = this.model.getBoosterType(group);
        const points = group.length * 10;

        this.isProcessing = true;
        const tileNode = this.getNodeAt(r, c);
        if (tileNode) {
            const worldPos = tileNode.parent.convertToWorldSpaceAR(tileNode.getPosition());
            this.showScoreAnimation(worldPos, points);
        }
        this.data.useMove();
        this.data.addScore(points);

        const nodesToDestroy = this.getNodesByCoords(group);
        this.model.clearCells(group);

        let count = 0;
        nodesToDestroy.forEach(node => {
            node.getComponent(TileComponent).destroyTile(() => {
                PoolManager.instance.putTile(node);
                count++;
                if (count === nodesToDestroy.length) {
                    if (boosterData) {
                        this.spawnBooster(r, c, boosterData.type);
                    }
                    this.processGridPhysics();
                }
            });
        });
    }

    private handleContinue() {
        const extra = this.config.economy.continueMoves; // Берем из Scriptable Object
        DataService.instance.continueGame(extra);

        // Сеньорская проверка: если ходы дали, но ходить нечем - шаффлим
        if (!this.model.hasAvailableMoves(this.config.economy.minMatch)) {
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
        let activeAnimations = 0;

        movements.forEach(move => {
            const node = this.getNodeAt(move.from.r, move.from.c);
            if (node) {
                activeAnimations++;
                const finalPos = this.getScreenPosition(move.to.r, move.to.c);
                const comp = node.getComponent(TileComponent);
                comp.gridPos.y = move.to.r;
                comp.gridPos.x = move.to.c;
                comp.moveTo(move.to.r, move.to.c, finalPos, () => {
                    activeAnimations--;
                    if (activeAnimations <= 0) this.finalizePhysics();
                });
            }
        });

        const news = this.model.fillEmptyCells();
        news.forEach(n => {
            activeAnimations++;
            const tileNode = PoolManager.instance.getTile();
            tileNode.parent = this.gridContainer;

            const finalPos = this.getScreenPosition(n.r, n.c);
            tileNode.setPosition(finalPos.x, (this._currentRows * this.tileSizeY) / 2 + 200);

            const comp = tileNode.getComponent(TileComponent);
            comp.init(n.type, n.r, n.c, (row, col) => this.tryBlast(row, col));
            comp.moveTo(n.r, n.c, finalPos, () => {
                activeAnimations--;
                if (activeAnimations <= 0) this.finalizePhysics();
            });
        });

        if (movements.length === 0 && news.length === 0) {
            this.finalizePhysics();
        }
    }

    private finalizePhysics() {
        this.isProcessing = false;
        this.checkPossibleMoves();
    }

    private getNodesByCoords(coords: {r:number, c:number}[]): cc.Node[] {
        return this.gridContainer.children.filter(node => {
            const comp = node.getComponent(TileComponent);
            if (!comp) return false;

            const cp = comp.gridPos;
            return coords.some(c => c.r === cp.y && c.c === cp.x);
        });
    }

    private getNodeAt(r: number, c: number): cc.Node {
        return this.gridContainer.children.find(node => {
            const comp = node.getComponent(TileComponent);
            if (!comp) return false;
            return comp.gridPos.y === r && comp.gridPos.x === c;
        });
    }

    private showScoreAnimation(worldPos: cc.Vec2, amount: number) {
        const popup = PoolManager.instance.getScorePopup();
        if (!popup) return;

        const canvas = cc.find("Canvas");
        popup.parent = canvas;

        popup.stopAllActions();
        popup.opacity = 255;
        popup.scale = 1;
        popup.zIndex = cc.macro.MAX_ZINDEX; // Выводим на самый верхний слой

        const localPos = canvas.convertToNodeSpaceAR(worldPos);
        popup.setPosition(localPos);

        const label = popup.getComponent(cc.Label) || popup.getComponentInChildren(cc.Label);
        if (label) {
            label.string = `+${amount}`;
        }

        cc.tween(popup)
            .parallel(
                cc.tween().by(0.8, { y: 150 }, { easing: 'sineOut' }),
                cc.tween().to(0.8, { opacity: 0 })
            )
            .call(() => {
                PoolManager.instance.putScorePopup(popup);
            })
            .start();
    }

    private activateBooster(r: number, c: number, type: number) {
        if (this.isProcessing && this._activeExplosionsCount === 0) return;

        // Ищем соседа-бустера для комбо (в радиусе 1 клетки)
        const neighborBooster = this.findNeighborBooster(r, c);

        if (neighborBooster) {
            this.executeCombo(r, c, type, neighborBooster.type);
        } else {
            this.executeSingleBooster(r, c, type);
        }
    }

    private spawnExplosionFXByPos(pos: cc.Vec2, fxType: number) {
        const fx = PoolManager.instance.getEffect(fxType);
        if (!fx) return;
        console.log("spawnExplosionFXByPos", fxType)

        // 1. Сначала выключаем, если вдруг была активна
        fx.active = false;

        fx.parent = this.gridContainer;
        fx.zIndex = cc.macro.MAX_ZINDEX;

        // 2. Поворачиваем и позиционируем ПЕРЕД активацией
        fx.setPosition(pos.x, pos.y);

        // 3. Теперь включаем ноду
        fx.active = true;

        const ps = fx.getComponent(cc.ParticleSystem);
        if (ps) {
            // 4. Форсированный перезапуск
            ps.stopSystem();
            ps.resetSystem();
        }

        this.scheduleOnce(() => {
            if (cc.isValid(fx) && fx.parent) {
                PoolManager.instance.putEffect(fx, fxType);
            }
        }, 1.2);
    }    private findNeighborBooster(r: number, c: number): {r: number, c: number, type: number} | null {
        const neighbors = [
            {r: r+1, c}, {r: r-1, c}, {r, c: c+1}, {r, c: c-1}
        ];
        for (const n of neighbors) {
            if (n.r >= 0 && n.r < this._currentRows && n.c >= 0 && n.c < this._currentCols) {
                const type = this.model.getTile(n.r, n.c);
                if (type >= 6 && type <= 9) return {r: n.r, c: n.c, type};
            }
        }
        return null;
    }

    private executeCombo(r1: number, c1: number, type1: number, type2: number) {
        this.isProcessing = true;
        let affected: {r: number, c: number}[] = [];
        const epicenter = { r: r1, c: c1 };

        // КОМБО: РАКЕТА + РАКЕТА или РАКЕТА + БОМБА
        const isRocket1 = type1 === 6 || type1 === 7;
        const isRocket2 = type2 === 6 || type2 === 7;
        const isBomb = type1 === 8 || type2 === 8;

        if ((isRocket1 && isRocket2) || (isRocket1 && isBomb) || (isRocket2 && isBomb)) {
            // 1. Логика: Зачищаем весь ряд и весь столбец (Крест)
            for (let i = 0; i < this._currentCols; i++) affected.push({ r: r1, c: i });
            for (let i = 0; i < this._currentRows; i++) affected.push({ r: i, c: c1 });

            // 2. Визуал: Бахаем "Мега-Крест" частицами в точке клика
            const pos = this.getScreenPosition(r1, c1);
            this.spawnCrossFX(pos);

            // Если это Бомба + Ракета, можно добавить еще и взрыв бомбы для жирности
            if (isBomb) this.spawnExplosionFXByPos(pos, 3);
        }
        else if (type1 === 9 || type2 === 9) {
            // МЕГА-БОМБА комбо: тотальная зачистка
            for (let i = 0; i < this._currentRows; i++) {
                for (let j = 0; j < this._currentCols; j++) affected.push({ r: i, c: j });
            }
            this.spawnExplosionFXByPos(this.getScreenPosition(r1, c1), 3); // Большой бабах
        }

        this.executeExplosion(affected, epicenter);
    }

    private async executeExplosion(coords: { r: number, c: number }[], epicenter?: { r: number, c: number }) {
        this._activeExplosionsCount++;
        GameController.shakeCamera();

        // 1. Подготовка: сортировка и удаление самого бустера, на который кликнули
        if (epicenter) {
            this.sortCoordsByEpicenter(coords, epicenter);
            this.removeEpicenterNode(epicenter);
        }

        const nodesToDestroy = this.getNodesByCoords(coords);
        if (nodesToDestroy.length === 0) {
            this.finishExplosionWave();
            return;
        }

        // 2. Запуск волны взрывов через итератор
        nodesToDestroy.forEach((node, index) => {
            const delay = index * this.config.animations.blastWaveDelay;
            this.scheduleOnce(() => {
                this.processSingleNodeExplosion(node, epicenter);

                // Если это последняя нода в текущем списке — закрываем волну
                if (index === nodesToDestroy.length - 1) {
                    this.finishExplosionWave();
                }
            }, delay);
        });
    }

    private sortCoordsByEpicenter(coords: { r: number, c: number }[], epi: { r: number, c: number }) {
        coords.sort((a, b) => {
            const distA = Math.abs(a.r - epi.r) + Math.abs(a.c - epi.c);
            const distB = Math.abs(b.r - epi.r) + Math.abs(b.c - epi.c);
            return distA - distB;
        });
    }

    private removeEpicenterNode(epi: { r: number, c: number }) {
        const epiNode = this.getNodeAt(epi.r, epi.c);
        if (!epiNode) return;

        const type = epiNode.getComponent(TileComponent).type;
        const pos = this.getScreenPosition(epi.r, epi.c);

        // Сначала звук и искры в правильном месте
        this.playExplosionEffects(pos, type);

        this.model.clearCells([epi]);
        PoolManager.instance.putBooster(epiNode, type);
    }

    private processSingleNodeExplosion(node: cc.Node, epicenter?: { r: number, c: number }) {
        if (!cc.isValid(node)) return;

        const comp = node.getComponent(TileComponent);
        const { y: r, x: c } = comp.gridPos;
        const type = comp.type;

        // Считаем позицию по индексам сетки (это никогда не подведет)
        const pos = this.getScreenPosition(r, c);

        // 1. Визуальные и звуковые эффекты (теперь по позиции)
        this.playExplosionEffects(pos, type);

        // 2. Логика уничтожения
        if (type >= 6 && type <= 9) {
            this.handleBoosterChainReaction(r, c, type, epicenter, node);
        } else {
            this.handleRegularTileDestruction(node, type, r, c);
        }
    }

    private playExplosionEffects(pos: cc.Vec2, tileType: number) {
        switch (tileType) {
            case 0:
                this.spawnExplosionFXByPos(pos, 0);
                break;
            case 6:
                this.spawnExplosionFXByPos(pos, 1);
                AudioManager.instance.play('booster');
                break;
            case 7:
                this.spawnExplosionFXByPos(pos, 2);
                AudioManager.instance.play('booster');
                break;
            case 8:
            case 9:
                this.spawnExplosionFXByPos(pos, 3);
                AudioManager.instance.playBlastSpam();
                break;
            default:
                this.spawnExplosionFXByPos(pos, 0);
        }
    }

    private handleRegularTileDestruction(node: cc.Node, type: number, r: number, c: number) {
        if (!cc.isValid(node) || !node.parent) return; // ЗАЩИТА: если нода уже в пуле, ничего не делаем

        this.model.clearCells([{ r, c }]);

        // 1. Считаем позицию (берем ЛОКАЛЬНУЮ из модели, чтобы не зависеть от parent)
        const localPos = this.getScreenPosition(r, c);

        // 2. Для анимации очков нам нужны мировые координаты.
        // Берем их у контейнера, так как он точно никуда не денется.
        const worldPos = this.gridContainer.convertToWorldSpaceAR(localPos);

        const points = this.config.economy.scoreTile;
        this.data.addScore(points);
        this.showScoreAnimation(worldPos, points);

        // 3. Анимация исчезновения
        node.getComponent(TileComponent).destroyTile(() => {
            PoolManager.instance.putTile(node);
        });
    }

    private handleBoosterChainReaction(r: number, c: number, type: number, epicenter: { r: number, c: number }, node: cc.Node) {
        // Проверка, чтобы не активировать тот же бустер, который запустил волну
        const isNotEpicenter = !epicenter || (r !== epicenter.r || c !== epicenter.c);

        if (isNotEpicenter) {
            this.model.clearCells([{ r, c }]);
            this.activateBooster(r, c, type);
            // Бустеры-жертвы убираем мгновенно для стабильности
            PoolManager.instance.putBooster(node, type);
        }
    }

    private spawnCrossFX(pos: cc.Vec2) {
        this.spawnExplosionFXByPos(pos, 1);
        this.spawnExplosionFXByPos(pos, 2);
        console.log("spawnCrossFX")
    }

    private finishExplosionWave() {
        this._activeExplosionsCount--;
        if (this._activeExplosionsCount <= 0) {
            this._activeExplosionsCount = 0;
            this.processGridPhysics();
        }
    }

    private executeSingleBooster(r: number, c: number, type: number) {
        let affected: { r: number, c: number }[] = [];

        switch (type) {
            case 6: // Горизонтальная ракета
                for (let i = 0; i < this._currentCols; i++) affected.push({ r, c: i });
                break;
            case 7: // Вертикальная ракета
                for (let i = 0; i < this._currentRows; i++) affected.push({ r: i, c });
                break;
            case 8: // Бомба (радиус 2 клетки, область 5х5)
                for (let i = r - 2; i <= r + 2; i++) {
                    for (let j = c - 2; j <= c + 2; j++) {
                        if (i >= 0 && i < this._currentRows && j >= 0 && j < this._currentCols) {
                            affected.push({ r: i, c: j });
                        }
                    }
                }
                break;
            case 9: // Мега-бомба (весь экран)
                for (let i = 0; i < this._currentRows; i++) {
                    for (let j = 0; j < this._currentCols; j++) affected.push({ r: i, c: j });
                }
                break;
        }

        this.executeExplosion(affected, { r, c });
    }

    private static shakeCamera() {
        const mainNode = cc.find("Canvas/Main Camera");
        if (!mainNode) return;

        cc.tween(mainNode)
            .by(0.05, { x: 10, y: 10 })
            .by(0.05, { x: -20, y: -10 })
            .by(0.05, { x: 10, y: 0 })
            .start();
    }
}
