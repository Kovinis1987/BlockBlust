import GridModel from "./GridModel";
import TileComponent from "./TileComponent";
import PoolManager from "./PoolManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default class GameController extends cc.Component {
    @property(cc.Node)
    gridContainer: cc.Node = null;

    @property(cc.Integer)
    currentLevel: number = 0;

    private model: GridModel = null;
    private isProcessing: boolean = false;
    private tileSizeX: number = 100;
    private tileSizeY: number = 112;

    // Сохраняем текущие размеры поля, чтобы методы ниже их видели
    private _currentRows: number = 8;
    private _currentCols: number = 8;

    onLoad() {
        this.loadLevelConfig();
        // Подписка на клик один раз
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
                const colorID = tilesData ? tilesData[r * cols + c] : Math.floor(Math.random() * 5);
                this.model.setTile(r, c, colorID);
                this.spawnTile(r, c, colorID);
            }
        }
    }

    private spawnTile(r: number, c: number, colorID: number) {
        const tileNode = PoolManager.instance.getTile();
        tileNode.parent = this.gridContainer;

        const pos = this.getScreenPosition(r, c);
        tileNode.setPosition(cc.v3(pos.x, pos.y, 0));

        const comp = tileNode.getComponent(TileComponent);
        comp.init(colorID, r, c);
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

        const offsetX = (this._currentCols - 1) * this.tileSizeX / 2;
        const offsetY = (this._currentRows - 1) * this.tileSizeX / 2;

        const c = Math.round((localPoint.x + offsetX) / this.tileSizeX);
        const r = Math.round((localPoint.y + offsetY) / this.tileSizeY);

        if (r >= 0 && r < this._currentRows && c >= 0 && c < this._currentCols) {
            this.tryBlast(r, c);
        }
    }

    private tryBlast(r: number, c: number) {
        const group = this.model.findGroup(r, c);
        if (group.length < 2) return;

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
                }
            });
        });
    }

    private processGridPhysics() {
        // 1. Падение существующих
        const movements = this.model.processFalling();
        movements.forEach(move => {
            const node = this.getNodeAt(move.from.r, move.from.c);
            if (node) {
                const newPos = this.getScreenPosition(move.to.r, move.to.c);
                node.getComponent(TileComponent).moveTo(move.to.r, move.to.c, newPos);
            }
        });

        // 2. Спавн новых в пустые места (теперь методы не требуют аргументов)
        const news = this.model.fillEmptyCells();
        news.forEach(n => {
            this.spawnTile(n.r, n.c, n.type);
        });

        this.scheduleOnce(() => { this.isProcessing = false; }, 0.3);
    }

    // Вспомогательные методы
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
}
