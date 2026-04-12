import TileComponent from "../../Presentation/Components/TileComponent";
import GameBoardHelper from "./GameBoardHelper";

export interface BoardStateValidationContext {
    model: { getTile: (r: number, c: number) => number };
    gridContainer: cc.Node;
    rows: number;
    cols: number;
}

export default class BoardStateValidationService {
    public validate(context: BoardStateValidationContext): boolean {
        const nodesByCoord = new Map<string, cc.Node>();

        for (const node of context.gridContainer.children) {
            const component = node.getComponent(TileComponent);
            if (!component) {
                continue;
            }

            const row = component.gridPos.y;
            const col = component.gridPos.x;
            if (!GameBoardHelper.isInsideGrid(row, col, context.rows, context.cols)) {
                return false;
            }

            const key = this.toKey(row, col);
            if (nodesByCoord.has(key)) {
                return false;
            }

            nodesByCoord.set(key, node);
        }

        for (let row = 0; row < context.rows; row++) {
            for (let col = 0; col < context.cols; col++) {
                const modelType = context.model.getTile(row, col);
                const node = nodesByCoord.get(this.toKey(row, col));

                if (GameBoardHelper.isObstacleType(modelType)) {
                    if (node) {
                        return false;
                    }
                    continue;
                }

                if (modelType === 0) {
                    if (node) {
                        return false;
                    }
                    continue;
                }

                if (!node) {
                    return false;
                }

                const component = node.getComponent(TileComponent);
                if (!component || component.type !== modelType) {
                    return false;
                }
            }
        }

        return true;
    }

    private toKey(row: number, col: number): string {
        return `${row},${col}`;
    }
}
