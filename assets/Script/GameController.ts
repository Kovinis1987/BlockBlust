import GridModel from "./GridModel";
import TileComponent from "./TileComponent";
import PoolManager from "./PoolManager";
import GameOverWindow from "./GameOverWindow";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameController extends cc.Component {
    @property(cc.Node)
    gridContainer: cc.Node = null;

    @property(cc.Integer)
    currentLevel: number = 0;

    @property(GameOverWindow)
    gameOverWindow: GameOverWindow = null;

    private score: number = 0;
    private movesLeft: number = 25;

    private model: GridModel = null;
    private isProcessing: boolean = false;
    private tileSizeX: number = 100;
    private tileSizeY: number = 112;
    private shuffleAttempts: number = 3;

    private _currentRows: number = 8;
    private _currentCols: number = 8;

    onLoad() {
        this.loadLevelConfig();
        this.node.on(cc.Node.EventType.TOUCH_END, this.handleTouch, this);
    }

    private loadLevelConfig() {
        cc.resources.load('configs/levels', cc.JsonAsset, (err, res: cc.JsonAsset) => {
            if (err || !res.json || !res.json[this.currentLevel]) {
                cc.warn("Level not found. Generating random 8x8...");
                this.setupGame(8, 8, null);
                return;
            }

            const data = res.json[this.currentLevel];
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
        if (this.isProcessing) return;

        const group = this.model.findGroup(r, c);
        if (group.length < 3) return;

        this.movesLeft--;
        this.score += group.length * 10;

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

    private showLosePopup() {
        this.gameOverWindow.show(
            this.score,
            () => this.handleContinue(),
            () => this.restartLevel()
        );
    }

    private handleContinue() {
        this.movesLeft += 5;
        this.shuffleAttempts = 1;
        this.shuffleGrid();
        this.isProcessing = false;
    }

    private restartLevel() {
        this.score = 0;
        this.movesLeft = 25;
        this.shuffleAttempts = 3;

        this.loadLevelConfig();
        this.isProcessing = false;
    }

    private checkPossibleMoves() {
        // Проверяем наличие групп >= 3 или бустеров (6-10)
        const hasMoves = this.model.hasAvailableMoves(3);

        if (!hasMoves) {
            if (this.shuffleAttempts > 0) {
                this.shuffleAttempts--;
                console.log("No moves! Shuffling...");
                this.shuffleGrid();
            } else {
                this.showLosePopup();
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
            const cp = node.getComponent(TileComponent).gridPos;
            return coords.some(c => c.r === cp.y && c.c === cp.x);
        });
    }

    private getNodeAt(r: number, c: number): cc.Node {
        return this.gridContainer.children.find(node => {
            const cp = node.getComponent(TileComponent).gridPos;
            return cp.y === r && cp.x === c;
        });
    }

    private spawnObstacle(r: number, c: number) {
        
    }
}
