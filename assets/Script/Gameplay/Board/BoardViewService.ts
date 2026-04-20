import TileComponent from "../../presentation/components/TileComponent";
import GridModel from "./GridModel";
import GameConfig from "../../config/GameConfig";
import {TileType} from "../types/TileType";
import GameBoardHelper from "./GameBoardHelper";
import PoolManager from "../../infrastructure/pooling/PoolManager";

export interface BoardViewState {
    model: GridModel;
    rows: number;
    cols: number;
    tileSizeX: number;
    tileSizeY: number;
}

export interface StartBoosterTilesConfig {
    rowRockets?: number;
    columnRockets?: number;
    bombs?: number;
    megas?: number;
}

export interface BoardViewContext {
    gridContainer: cc.Node;
    obstaclePrefab: cc.Prefab;
    config: GameConfig;
    poolManager: PoolManager;
    tileSizeX: number;
    tileSizeY: number;
    onTileClick: (r: number, c: number) => void;
    scheduleOnce: (callback: () => void, delay: number) => void;
    setProcessing: (value: boolean) => void;
}

export default class BoardViewService {
    public buildBoard(
        rows: number,
        cols: number,
        tilesData: number[] | null,
        startBoosterTiles: StartBoosterTilesConfig | null,
        context: BoardViewContext
    ): BoardViewState {
        this.setupGridSize(rows, cols, context);

        const tileSizeX = context.tileSizeX > 0 ? context.tileSizeX : 100;
        const tileSizeY = context.tileSizeY > 0 ? context.tileSizeY : 112;
        const model = new GridModel(rows, cols, context.config);

        context.gridContainer.removeAllChildren();
        this.adaptGridScale(rows, cols, tileSizeX, tileSizeY, context.gridContainer);
        this.spawnWithJuice(model, rows, cols, tilesData, {
            ...context,
            tileSizeX,
            tileSizeY,
        });
        this.applyStartBoosterTiles(model, rows, cols, startBoosterTiles, context);

        return {
            model,
            rows,
            cols,
            tileSizeX,
            tileSizeY,
        };
    }

    public spawnBooster(
        model: GridModel,
        row: number,
        col: number,
        type: number,
        context: BoardViewContext
    ): void {
        model.setTile(row, col, type);
        const node = context.poolManager.getBooster(type);
        this.configureTileNode(node, type, row, col, context);
    }

    public getScreenPosition(
        row: number,
        col: number,
        gridContainer: cc.Node,
        config: GameConfig,
        tileSizeX: number,
        tileSizeY: number
    ): cc.Vec2 {
        const gridW = gridContainer.width;
        const gridH = gridContainer.height;

        const x = -gridW / 2 + config.grid.paddingLeft + (col * (tileSizeX + config.grid.spacingX)) + (tileSizeX / 2);
        const y = -gridH / 2 + config.grid.paddingBottom + (row * (tileSizeY + config.grid.spacingY)) + (tileSizeY / 2);

        return cc.v2(x, y);
    }

    private spawnWithJuice(
        model: GridModel,
        rows: number,
        cols: number,
        tilesData: number[] | null,
        context: BoardViewContext
    ): void {
        context.setProcessing(true);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const dataIndex = (rows - 1 - row) * cols + col;
                const rawValue = tilesData ? tilesData[dataIndex] : 0;
                let node: cc.Node = null;

                if (GameBoardHelper.isObstacleType(rawValue)) {
                    model.setTile(row, col, TileType.OBSTACLE);
                    node = this.spawnObstacle(row, col, context);
                } else if (GameBoardHelper.isBoosterType(rawValue)) {
                    model.setTile(row, col, rawValue);
                    node = context.poolManager.getBooster(rawValue);
                    this.configureTileNode(node, rawValue, row, col, context);
                } else {
                    const colorId = rawValue === TileType.EMPTY
                        ? (Math.floor(Math.random() * 4) + TileType.RED)
                        : rawValue;
                    model.setTile(row, col, colorId);
                    node = context.poolManager.getTile();
                    this.configureTileNode(node, colorId, row, col, context);
                }

                if (!node) {
                    continue;
                }

                node.scale = 0;
                const delay = (row * 0.05) + (col * 0.01);
                cc.tween(node)
                    .delay(delay)
                    .to(0.3, {scale: 1}, {easing: "backOut"})
                    .start();
            }
        }

        context.scheduleOnce(() => {
            context.setProcessing(false);
        }, 0.5);
    }

    private applyStartBoosterTiles(
        model: GridModel,
        rows: number,
        cols: number,
        config: StartBoosterTilesConfig | null,
        context: BoardViewContext
    ): void {
        if (!config) {
            return;
        }

        const boosterTypes = this.buildStartBoosterQueue(config);
        if (boosterTypes.length === 0) {
            return;
        }

        const candidateCells = this.collectColorCells(model, rows, cols);
        this.shuffleCells(candidateCells);

        boosterTypes.forEach((type, index) => {
            const cell = candidateCells[index];
            if (!cell) {
                return;
            }

            this.replaceTileWithBooster(model, cell.r, cell.c, type, context);
        });
    }

    private buildStartBoosterQueue(config: StartBoosterTilesConfig): number[] {
        const queue: number[] = [];
        this.pushBoosterCopies(queue, TileType.ROCKET_VERTICAL, config.rowRockets ?? 0);
        this.pushBoosterCopies(queue, TileType.ROCKET_HORIZONTAL, config.columnRockets ?? 0);
        this.pushBoosterCopies(queue, TileType.BOMB, config.bombs ?? 0);
        this.pushBoosterCopies(queue, TileType.MEGA, config.megas ?? 0);
        return queue;
    }

    private pushBoosterCopies(queue: number[], type: number, count: number): void {
        for (let i = 0; i < count; i++) {
            queue.push(type);
        }
    }

    private collectColorCells(model: GridModel, rows: number, cols: number): Array<{ r: number; c: number }> {
        const cells: Array<{ r: number; c: number }> = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (GameBoardHelper.isColorType(model.getTile(row, col))) {
                    cells.push({r: row, c: col});
                }
            }
        }
        return cells;
    }

    private shuffleCells(cells: Array<{ r: number; c: number }>): void {
        for (let i = cells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cells[i], cells[j]] = [cells[j], cells[i]];
        }
    }

    private replaceTileWithBooster(
        model: GridModel,
        row: number,
        col: number,
        type: number,
        context: BoardViewContext
    ): void {
        const node = this.findTileNodeAt(context.gridContainer, row, col);
        if (!node) {
            return;
        }

        context.poolManager.putTile(node);
        model.setTile(row, col, type);

        const boosterNode = context.poolManager.getBooster(type);
        if (!boosterNode) {
            return;
        }

        this.configureTileNode(boosterNode, type, row, col, context);
        boosterNode.scale = 0;
        cc.tween(boosterNode)
            .delay(0.15)
            .to(0.25, {scale: 1}, {easing: "backOut"})
            .start();
    }

    private findTileNodeAt(gridContainer: cc.Node, row: number, col: number): cc.Node | null {
        return gridContainer.children.find((node) => {
            const component = node.getComponent(TileComponent);
            return !!component && component.gridPos.y === row && component.gridPos.x === col;
        }) || null;
    }

    private spawnObstacle(row: number, col: number, context: BoardViewContext): cc.Node {
        const node = cc.instantiate(context.obstaclePrefab);
        node.parent = context.gridContainer;
        const pos = this.getScreenPosition(row, col, context.gridContainer, context.config, context.tileSizeX, context.tileSizeY);
        node.setPosition(pos.x, pos.y);
        return node;
    }

    private configureTileNode(node: cc.Node, type: number, row: number, col: number, context: BoardViewContext): void {
        node.parent = context.gridContainer;
        const pos = this.getScreenPosition(row, col, context.gridContainer, context.config, context.tileSizeX, context.tileSizeY);
        node.setPosition(cc.v3(pos.x, pos.y, 0));

        const component = node.getComponent(TileComponent);
        component.init(type, row, col, (targetRow, targetCol) => context.onTileClick(targetRow, targetCol));
    }

    private adaptGridScale(
        rows: number,
        cols: number,
        tileSizeX: number,
        tileSizeY: number,
        gridContainer: cc.Node
    ): void {
        const maxW = cc.winSize.width - 80;
        const maxH = cc.winSize.height - 450;
        const gridW = cols * tileSizeX;
        const gridH = rows * tileSizeY;
        const scaleX = maxW / gridW;
        const scaleY = maxH / gridH;
        gridContainer.scale = Math.min(scaleX, scaleY, 1);
        gridContainer.opacity = 0;
        cc.tween(gridContainer)
            .to(0.3, {opacity: 255})
            .start();
    }

    private setupGridSize(rows: number, cols: number, context: BoardViewContext): void {
        const pLeft = 55;
        const pRight = 55;
        const pTop = 55;
        const pBottom = 55;
        const spacingX = 4;
        const spacingY = 4;

        const totalW = pLeft + pRight + (cols * context.tileSizeX) + ((cols - 1) * spacingX);
        const totalH = pTop + pBottom + (rows * context.tileSizeY) + ((rows - 1) * spacingY);

        context.gridContainer.setContentSize(totalW, totalH);
    }
}
