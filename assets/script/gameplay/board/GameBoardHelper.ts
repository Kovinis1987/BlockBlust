import EffectTypes from "../Types/EffectTypes";
import {TileType} from "../Types/TileType";

export type GridCoord = { r: number, c: number };

export default class GameBoardHelper {
    public static isInsideGrid(r: number, c: number, rows: number, cols: number): boolean {
        return r >= 0 && r < rows && c >= 0 && c < cols;
    }

    public static isBoosterType(type: number): boolean {
        return type >= TileType.ROCKET_VERTICAL && type <= TileType.MEGA;
    }

    public static isObstacleType(type: number): boolean {
        return type === TileType.OBSTACLE;
    }

    public static isColorType(type: number): boolean {
        return type >= TileType.RED && type <= TileType.YELLOW;
    }

    public static isRocketType(type: number): boolean {
        return type === TileType.ROCKET_VERTICAL || type === TileType.ROCKET_HORIZONTAL;
    }

    // Legacy enum names are preserved for scene/prefab serialization compatibility.
    // In gameplay semantics ROCKET_VERTICAL burns a row, ROCKET_HORIZONTAL burns a column.
    public static isRowBlastRocket(type: number): boolean {
        return type === TileType.ROCKET_VERTICAL;
    }

    public static isColumnBlastRocket(type: number): boolean {
        return type === TileType.ROCKET_HORIZONTAL;
    }

    public static isBombFamilyType(type: number): boolean {
        return type === TileType.BOMB || type === TileType.MEGA;
    }

    public static collectRowCells(r: number, cols: number): GridCoord[] {
        const cells: GridCoord[] = [];
        for (let c = 0; c < cols; c++) {
            cells.push({r, c});
        }
        return cells;
    }

    public static collectColumnCells(c: number, rows: number): GridCoord[] {
        const cells: GridCoord[] = [];
        for (let r = 0; r < rows; r++) {
            cells.push({r, c});
        }
        return cells;
    }

    public static collectSquareCells(centerR: number, centerC: number, radius: number, rows: number, cols: number): GridCoord[] {
        const cells: GridCoord[] = [];
        for (let r = centerR - radius; r <= centerR + radius; r++) {
            for (let c = centerC - radius; c <= centerC + radius; c++) {
                if (this.isInsideGrid(r, c, rows, cols)) {
                    cells.push({r, c});
                }
            }
        }
        return cells;
    }

    public static collectAllCells(rows: number, cols: number): GridCoord[] {
        const cells: GridCoord[] = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                cells.push({r, c});
            }
        }
        return cells;
    }

    public static collectRocketBlastCells(type: number, r: number, c: number, rows: number, cols: number): GridCoord[] {
        if (this.isRowBlastRocket(type)) {
            return this.collectRowCells(r, cols);
        }

        if (this.isColumnBlastRocket(type)) {
            return this.collectColumnCells(c, rows);
        }

        return [];
    }

    public static getRocketEffectType(type: number): number {
        if (this.isRowBlastRocket(type)) {
            return EffectTypes.ROCKET_VERTICAL;
        }

        if (this.isColumnBlastRocket(type)) {
            return EffectTypes.ROCKET_HORIZONTAL;
        }

        return EffectTypes.TILE_NORMAL;
    }

    public static getEffectTypeForTile(type: number): number {
        if (this.isRocketType(type)) return this.getRocketEffectType(type);
        if (this.isBombFamilyType(type)) return EffectTypes.BOMB;
        return EffectTypes.TILE_NORMAL;
    }
}
