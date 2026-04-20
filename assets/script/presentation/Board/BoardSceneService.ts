import GameConfig from "../../config/GameConfig";
import PoolManager from "../../infrastructure/pooling/PoolManager";
import BoardViewService, {BoardViewState, StartBoosterTilesConfig} from "../../gameplay/board/BoardViewService";
import GridPhysicsService from "../../gameplay/board/GridPhysicsService";
import GridModel from "../../gameplay/board/GridModel";
import TileComponent from "../components/TileComponent";

export interface GridCoord {
    r: number;
    c: number;
}

export default class BoardSceneService {
    constructor(
        private readonly gridContainer: cc.Node,
        private readonly obstaclePrefab: cc.Prefab,
        private readonly config: GameConfig,
        private readonly poolManager: PoolManager,
        private readonly boardViewService: BoardViewService,
        private readonly gridPhysicsService: GridPhysicsService,
    ) {
    }

    public buildBoard(
        rows: number,
        cols: number,
        tilesData: number[] | null,
        startBoosterTiles: StartBoosterTilesConfig | null,
        tileSizeX: number,
        tileSizeY: number,
        onTileClick: (r: number, c: number) => void,
        scheduleOnce: (callback: () => void, delay: number) => void,
        setProcessing: (value: boolean) => void,
    ): BoardViewState {
        return this.boardViewService.buildBoard(rows, cols, tilesData, startBoosterTiles, {
            gridContainer: this.gridContainer,
            obstaclePrefab: this.obstaclePrefab,
            config: this.config,
            poolManager: this.poolManager,
            tileSizeX,
            tileSizeY,
            onTileClick,
            scheduleOnce,
            setProcessing,
        });
    }

    public spawnBooster(
        model: GridModel,
        row: number,
        col: number,
        type: number,
        tileSizeX: number,
        tileSizeY: number,
        onTileClick: (r: number, c: number) => void,
        scheduleOnce: (callback: () => void, delay: number) => void,
        setProcessing: (value: boolean) => void,
    ): void {
        this.boardViewService.spawnBooster(model, row, col, type, {
            gridContainer: this.gridContainer,
            obstaclePrefab: this.obstaclePrefab,
            config: this.config,
            poolManager: this.poolManager,
            tileSizeX,
            tileSizeY,
            onTileClick,
            scheduleOnce,
            setProcessing,
        });
    }

    public processPhysics(
        model: GridModel,
        currentRows: number,
        tileSizeX: number,
        tileSizeY: number,
        onTileClick: (r: number, c: number) => void,
        onComplete: () => void,
    ): void {
        this.gridPhysicsService.process({
            model,
            gridContainer: this.gridContainer,
            currentRows,
            tileSizeY,
            poolManager: this.poolManager,
            getNodeAt: (r, c) => this.getNodeAt(r, c),
            getScreenPosition: (r, c) => this.getScreenPosition(r, c, tileSizeX, tileSizeY),
            onTileClick,
            onComplete,
        });
    }

    public clearBoard(): void {
        this.gridContainer.removeAllChildren();
    }

    public getScreenPosition(row: number, col: number, tileSizeX: number, tileSizeY: number): cc.Vec2 {
        return this.boardViewService.getScreenPosition(
            row,
            col,
            this.gridContainer,
            this.config,
            tileSizeX,
            tileSizeY
        );
    }

    public getNodeAt(r: number, c: number): cc.Node | null {
        return this.gridContainer.children.find(node => {
            const comp = node.getComponent(TileComponent);
            return !!comp && comp.gridPos.y === r && comp.gridPos.x === c;
        }) || null;
    }

    public countNodesAt(coords: GridCoord[]): number {
        return coords.filter(coord => this.hasTileAt(coord.r, coord.c)).length;
    }

    public hasTileAt(r: number, c: number): boolean {
        return this.getNodeAt(r, c) !== null;
    }

    public emphasizeTeleportSelection(r: number, c: number): void {
        const node = this.getNodeAt(r, c);
        if (!node) {
            return;
        }

        cc.tween(node)
            .to(0.1, {scale: 1.2})
            .call(() => {
                node.zIndex = 100;
                if (node.parent) {
                    node.parent.sortAllChildren();
                }
            })
            .start();
    }

    public resetTeleportSelection(r: number, c: number): void {
        const node = this.getNodeAt(r, c);
        if (!node) {
            return;
        }

        const parent = node.parent;
        cc.tween(node).to(0.1, {scale: 1}).start();
        node.zIndex = 0;
        if (parent) {
            parent.sortAllChildren();
        }
    }

    public swapTiles(first: GridCoord, second: GridCoord, onComplete: () => void): void {
        const firstNode = this.getNodeAt(first.r, first.c);
        const secondNode = this.getNodeAt(second.r, second.c);
        if (!firstNode || !secondNode) {
            onComplete();
            return;
        }

        const firstComponent = firstNode.getComponent(TileComponent);
        const secondComponent = secondNode.getComponent(TileComponent);
        const firstPosition = firstNode.position;
        const secondPosition = secondNode.position;

        cc.tween(firstNode)
            .to(0.3, {position: secondPosition}, {easing: "quadOut"})
            .call(() => {
                firstComponent.gridPos = cc.v2(second.c, second.r);
                firstNode.zIndex = 0;
                if (firstNode.parent) {
                    firstNode.parent.sortAllChildren();
                }
            })
            .start();

        cc.tween(secondNode)
            .to(0.3, {position: firstPosition}, {easing: "quadOut"})
            .call(() => {
                secondComponent.gridPos = cc.v2(first.c, first.r);
                secondNode.zIndex = 0;
                if (secondNode.parent) {
                    secondNode.parent.sortAllChildren();
                }
                onComplete();
            })
            .start();
    }

    public shakeTile(r: number, c: number): void {
        const node = this.getNodeAt(r, c);
        if (!node) {
            return;
        }

        node.getComponent(TileComponent).shake();
    }

    public destroyTileAt(r: number, c: number, onComplete: () => void): boolean {
        const node = this.getNodeAt(r, c);
        if (!node) {
            return false;
        }

        node.getComponent(TileComponent).destroyTile(() => {
            this.poolManager.putTile(node);
            onComplete();
        });
        return true;
    }

    public recycleBoosterAt(r: number, c: number, type: number): boolean {
        const node = this.getNodeAt(r, c);
        if (!node) {
            return false;
        }

        this.poolManager.putBooster(node, type);
        return true;
    }

    public shuffleView(model: GridModel, onTileClick: (r: number, c: number) => void): void {
        this.gridContainer.children.forEach(node => {
            const component = node.getComponent(TileComponent);
            if (!component) {
                return;
            }

            const newType = model.getTile(component.gridPos.y, component.gridPos.x);
            component.init(newType, component.gridPos.y, component.gridPos.x, onTileClick);
        });
    }
}
