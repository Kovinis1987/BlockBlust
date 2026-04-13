import EffectTypes from "../../assets/script/gameplay/types/EffectTypes";
import {TileType} from "../../assets/script/gameplay/types/TileType";
import GameBoardHelper from "../../assets/script/gameplay/board/GameBoardHelper";

describe("GameBoardHelper", () => {
    it("detects bounds and tile categories", () => {
        expect(GameBoardHelper.isInsideGrid(0, 0, 3, 3)).toBe(true);
        expect(GameBoardHelper.isInsideGrid(-1, 0, 3, 3)).toBe(false);
        expect(GameBoardHelper.isBoosterType(TileType.ROCKET_VERTICAL)).toBe(true);
        expect(GameBoardHelper.isBoosterType(TileType.BLUE)).toBe(false);
        expect(GameBoardHelper.isObstacleType(TileType.OBSTACLE)).toBe(true);
        expect(GameBoardHelper.isColorType(TileType.YELLOW)).toBe(true);
        expect(GameBoardHelper.isRocketType(TileType.ROCKET_HORIZONTAL)).toBe(true);
        expect(GameBoardHelper.isBombFamilyType(TileType.MEGA)).toBe(true);
        expect(GameBoardHelper.isRowBlastRocket(TileType.ROCKET_VERTICAL)).toBe(true);
        expect(GameBoardHelper.isColumnBlastRocket(TileType.ROCKET_HORIZONTAL)).toBe(true);
    });

    it("collects expected board coordinates", () => {
        expect(GameBoardHelper.collectRowCells(1, 4)).toEqual([
            {r: 1, c: 0},
            {r: 1, c: 1},
            {r: 1, c: 2},
            {r: 1, c: 3}
        ]);

        expect(GameBoardHelper.collectColumnCells(2, 3)).toEqual([
            {r: 0, c: 2},
            {r: 1, c: 2},
            {r: 2, c: 2}
        ]);

        expect(GameBoardHelper.collectSquareCells(0, 0, 1, 3, 3)).toEqual([
            {r: 0, c: 0},
            {r: 0, c: 1},
            {r: 1, c: 0},
            {r: 1, c: 1}
        ]);

        expect(GameBoardHelper.collectAllCells(2, 2)).toEqual([
            {r: 0, c: 0},
            {r: 0, c: 1},
            {r: 1, c: 0},
            {r: 1, c: 1}
        ]);

        expect(GameBoardHelper.collectRocketBlastCells(TileType.ROCKET_VERTICAL, 1, 1, 3, 4)).toEqual([
            {r: 1, c: 0},
            {r: 1, c: 1},
            {r: 1, c: 2},
            {r: 1, c: 3}
        ]);

        expect(GameBoardHelper.collectRocketBlastCells(TileType.ROCKET_HORIZONTAL, 1, 1, 3, 4)).toEqual([
            {r: 0, c: 1},
            {r: 1, c: 1},
            {r: 2, c: 1}
        ]);
    });

    it("maps tile types to effect types", () => {
        expect(GameBoardHelper.getEffectTypeForTile(TileType.ROCKET_VERTICAL)).toBe(EffectTypes.ROCKET_VERTICAL);
        expect(GameBoardHelper.getEffectTypeForTile(TileType.ROCKET_HORIZONTAL)).toBe(EffectTypes.ROCKET_HORIZONTAL);
        expect(GameBoardHelper.getEffectTypeForTile(TileType.BOMB)).toBe(EffectTypes.BOMB);
        expect(GameBoardHelper.getEffectTypeForTile(TileType.MEGA)).toBe(EffectTypes.BOMB);
        expect(GameBoardHelper.getEffectTypeForTile(TileType.RED)).toBe(EffectTypes.TILE_NORMAL);
    });
});
