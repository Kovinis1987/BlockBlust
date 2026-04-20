import GridModel from "./GridModel";
import PoolManager from "../../infrastructure/pooling/PoolManager";
import TileComponent from "../../presentation/components/TileComponent";

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
        const resolvedMovements = this.resolveMovementChains(movements);
        let activeAnimations = 0;

        resolvedMovements.forEach(move => {
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

        if (resolvedMovements.length === 0 && newTiles.length === 0) {
            context.onComplete();
        }
    }

    private resolveMovementChains(
        movements: Array<{ from: { r: number, c: number }, to: { r: number, c: number } }>
    ): Array<{ from: { r: number, c: number }, to: { r: number, c: number } }> {
        const chains = new Map<string, { from: { r: number, c: number }, to: { r: number, c: number } }>();
        const currentPositions = new Map<string, string>();

        movements.forEach(move => {
            const fromKey = this.toKey(move.from.r, move.from.c);
            const toKey = this.toKey(move.to.r, move.to.c);
            const originalKey = currentPositions.get(fromKey);

            if (originalKey) {
                const chain = chains.get(originalKey);
                if (!chain) {
                    return;
                }

                chain.to = move.to;
                currentPositions.delete(fromKey);
                currentPositions.set(toKey, originalKey);
                return;
            }

            chains.set(fromKey, {
                from: move.from,
                to: move.to,
            });
            currentPositions.set(toKey, fromKey);
        });

        return Array.from(chains.values());
    }

    private toKey(r: number, c: number): string {
        return `${r},${c}`;
    }
}
