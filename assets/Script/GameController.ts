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
        this.gridContainer.removeAllChildren();

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let rawValue = tilesData ? tilesData[r * cols + c] : 0;
                let finalType: number;

                if (rawValue === 0) {
                    finalType = Math.floor(Math.random() * 4) + 2;
                } else if (rawValue === 1) {
                    this.model.setTile(r, c, 1);
                    this.spawnObstacle(r, c); // Опционально
                    continue;
                } else if (rawValue >= 2 && rawValue <= 5) {
                    finalType = rawValue;
                } else {
                    continue;
                }

                this.model.setTile(r, c, finalType);
                this.spawnTile(r, c, finalType);
            }
        }
    }

    private spawnTile(r: number, c: number, colorID: number) {
        const tileNode = PoolManager.instance.getTile();
        tileNode.parent = this.gridContainer;

        const pos = this.getScreenPosition(r, c);
        tileNode.setPosition(cc.v3(pos.x, pos.y, 0));

        const comp = tileNode.getComponent(TileComponent);
        comp.init(colorID, r, c, (row, col) => this.tryBlast(row, col));
    }

    private getScreenPosition(r: number, c: number): cc.Vec2 {
        const offsetX = (this._currentCols - 1) * this.tileSizeX / 2;
        const offsetY = (this._currentRows - 1) * this.tileSizeY / 2;
        return cc.v2(c * this.tileSizeX - offsetX, r * this.tileSizeY - offsetY);
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

    private spawnObstacle(r: number, c: number) {
        if (!this.obstaclePrefab) return;

        const obstacleNode = cc.instantiate(this.obstaclePrefab);
        obstacleNode.parent = this.gridContainer;

        const pos = this.getScreenPosition(r, c);
        obstacleNode.setPosition(cc.v3(pos.x, pos.y, 0));
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
