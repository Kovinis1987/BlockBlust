import GridModel from "../Component/GridModel";
import PoolManager from "./PoolManager";
import TileComponent from "../Component/TileComponent";

export interface GridPhysicsContext {
    model: GridModel;
    gridContainer: cc.Node;
    currentRows: number;
    tileSizeY: number;
    poolManager: PoolManager;
    getNodeAt: (r: number, c: number) => cc.Node | null;
    getScreenPosition: (r: number, c: number) => cc.Vec2;
    onTileClick: (r: number, c: number) => void;
    onComplete: () => void;
}

export default class GridPhysicsService {
    public process(context: GridPhysicsContext): void {
        const movements = context.model.processFalling();
        let activeAnimations = 0;

        movements.forEach(move => {
            const node = context.getNodeAt(move.from.r, move.from.c);
            if (!node) return;

            activeAnimations++;
            const finalPos = context.getScreenPosition(move.to.r, move.to.c);
            const comp = node.getComponent(TileComponent);
            comp.gridPos.y = move.to.r;
            comp.moveTo(move.to.r, move.to.c, finalPos, () => {
                activeAnimations--;
                if (activeAnimations <= 0) {
                    context.onComplete();
                }
            });
        });

        const newTiles = context.model.fillEmptyCells();
        newTiles.forEach(tile => {
            activeAnimations++;
            const tileNode = context.poolManager.getTile();
            tileNode.parent = context.gridContainer;

            const startY = (context.currentRows * context.tileSizeY) / 2 + 200;
            const finalPos = context.getScreenPosition(tile.r, tile.c);
            tileNode.setPosition(finalPos.x, startY);

            const comp = tileNode.getComponent(TileComponent);
            comp.init(tile.type, tile.r, tile.c, (row, col) => context.onTileClick(row, col));

            comp.moveTo(tile.r, tile.c, finalPos, () => {
                activeAnimations--;
                if (activeAnimations <= 0) {
                    context.onComplete();
                }
            });
        });

        if (movements.length === 0 && newTiles.length === 0) {
            context.onComplete();
        }
    }
}
