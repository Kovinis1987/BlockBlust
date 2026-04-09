import EffectTypes from "../Enum/EffectTypes";
import {TileType} from "../Enum/TileType";
import GameBoardHelper, {GridCoord} from "./GameBoardHelper";

export interface BoosterPlan {
    affected: GridCoord[];
    fxType: number;
    playCrossFx?: boolean;
    preExplosionFxType?: number;
}

export interface NeighborBooster {
    r: number;
    c: number;
    type: number;
}

export default class BoosterResolutionService {
    public static findNeighborBooster(
        r: number,
        c: number,
        rows: number,
        cols: number,
        getTile: (r: number, c: number) => number
    ): NeighborBooster | null {
        const neighbors = [
            {r: r + 1, c}, {r: r - 1, c}, {r, c: c + 1}, {r, c: c - 1}
        ];

        for (const n of neighbors) {
            if (!GameBoardHelper.isInsideGrid(n.r, n.c, rows, cols)) continue;

            const type = getTile(n.r, n.c);
            if (GameBoardHelper.isBoosterType(type)) {
                return {r: n.r, c: n.c, type};
            }
        }

        return null;
    }

    public static buildSinglePlan(
        r: number,
        c: number,
        type: number,
        rows: number,
        cols: number,
        bombRadius: number
    ): BoosterPlan {
        let affected: GridCoord[] = [];
        let fxType = EffectTypes.TILE_NORMAL;

        switch (type) {
            case TileType.ROCKET_VERTICAL:
                affected = GameBoardHelper.collectRowCells(r, cols);
                fxType = EffectTypes.ROCKET_VERTICAL;
                break;
            case TileType.ROCKET_HORIZONTAL:
                affected = GameBoardHelper.collectColumnCells(c, rows);
                fxType = EffectTypes.ROCKET_HORIZONTAL;
                break;
            case TileType.BOMB:
                affected = GameBoardHelper.collectSquareCells(r, c, bombRadius, rows, cols);
                fxType = EffectTypes.BOMB;
                break;
            case TileType.MEGA:
                affected = GameBoardHelper.collectAllCells(rows, cols);
                fxType = EffectTypes.BOMB;
                break;
        }

        return {
            affected,
            fxType
        };
    }

    public static buildComboPlan(
        r1: number,
        c1: number,
        type1: number,
        type2: number,
        rows: number,
        cols: number,
        bombRadius: number
    ): BoosterPlan {
        const firstIsRocket = GameBoardHelper.isRocketType(type1);
        const secondIsRocket = GameBoardHelper.isRocketType(type2);
        const firstIsBombFamily = GameBoardHelper.isBombFamilyType(type1);
        const secondIsBombFamily = GameBoardHelper.isBombFamilyType(type2);

        if (firstIsRocket && secondIsRocket) {
            return {
                affected: this.removeDuplicates([
                    ...GameBoardHelper.collectRowCells(r1, cols),
                    ...GameBoardHelper.collectColumnCells(c1, rows),
                ]),
                fxType: EffectTypes.ROCKET_VERTICAL,
                playCrossFx: true
            };
        }

        if (firstIsBombFamily && secondIsBombFamily) {
            return {
                affected: GameBoardHelper.collectSquareCells(r1, c1, bombRadius + 1, rows, cols),
                fxType: EffectTypes.MEGA,
                preExplosionFxType: EffectTypes.BOMB
            };
        }

        if (firstIsRocket || secondIsRocket) {
            const rocketType = type1 === TileType.ROCKET_VERTICAL || type2 === TileType.ROCKET_VERTICAL
                ? TileType.ROCKET_VERTICAL
                : TileType.ROCKET_HORIZONTAL;

            const lineCells = rocketType === TileType.ROCKET_VERTICAL
                ? GameBoardHelper.collectRowCells(r1, cols)
                : GameBoardHelper.collectColumnCells(c1, rows);

            return {
                affected: this.removeDuplicates([
                    ...lineCells,
                    ...GameBoardHelper.collectSquareCells(r1, c1, bombRadius, rows, cols),
                ]),
                fxType: EffectTypes.BOMB,
                preExplosionFxType: EffectTypes.ROCKET_HORIZONTAL
            };
        }

        return {
            affected: [{r: r1, c: c1}],
            fxType: EffectTypes.BOMB
        };
    }

    public static sortCoordsByEpicenter(coords: GridCoord[], epi: GridCoord): void {
        coords.sort((a, b) => {
            const distA = Math.abs(a.r - epi.r) + Math.abs(a.c - epi.c);
            const distB = Math.abs(b.r - epi.r) + Math.abs(b.c - epi.c);
            return distA - distB;
        });
    }

    public static removeDuplicates(coords: GridCoord[]): GridCoord[] {
        const seen = new Set<string>();
        return coords.filter(coord => {
            const key = `${coord.r},${coord.c}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
