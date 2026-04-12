import GridModel from "../../assets/Script/Gameplay/Board/GridModel";
import {TileType} from "../../assets/Script/Gameplay/Types/TileType";

describe("GridModel", () => {
    function createModel(rows = 5, cols = 5) {
        const config = {
            economy: {
                rocketMin: 5,
                bombMin: 7,
                megaMin: 10
            }
        } as any;

        return new GridModel(rows, cols, config);
    }

    it("finds connected groups", () => {
        const model = createModel(3, 3);
        model.setTile(0, 0, TileType.RED);
        model.setTile(0, 1, TileType.RED);
        model.setTile(1, 0, TileType.RED);
        model.setTile(2, 2, TileType.BLUE);

        expect(model.findGroup(0, 0)).toHaveLength(3);
        expect(model.findGroup(2, 2)).toHaveLength(1);
    });

    it("clears non-obstacle tiles", () => {
        const model = createModel(2, 2);
        model.setTile(0, 0, TileType.OBSTACLE);
        model.setTile(0, 1, TileType.BLUE);
        model.clearCells([{r: 0, c: 0}, {r: 0, c: 1}]);

        expect(model.getTile(0, 0)).toBe(TileType.OBSTACLE);
        expect(model.getTile(0, 1)).toBe(TileType.EMPTY);
    });

    it("processes falling and fills empty cells", () => {
        const model = createModel(3, 3);
        model.setTile(2, 0, TileType.RED);
        model.setTile(2, 1, TileType.BLUE);

        const movements = model.processFalling();
        expect(movements).toEqual(
            expect.arrayContaining([
                {from: {r: 2, c: 0}, to: {r: 0, c: 0}},
                {from: {r: 2, c: 1}, to: {r: 0, c: 1}}
            ])
        );

        const newTiles = model.fillEmptyCells();
        expect(newTiles.length).toBeGreaterThan(0);
        expect(model.isEmpty(0, 0)).toBe(false);
    });

    it("selects booster type by group size", () => {
        const model = createModel(10, 10);
        expect(model.getBoosterType(new Array(4).fill({r: 0, c: 0} as never))).toBeNull();
        expect(model.getBoosterType(new Array(5).fill({r: 0, c: 0} as never))).toEqual({type: TileType.ROCKET_VERTICAL});
        expect(model.getBoosterType(new Array(7).fill({r: 0, c: 0} as never))).toEqual({type: TileType.BOMB});
        expect(model.getBoosterType(new Array(10).fill({r: 0, c: 0} as never))).toEqual({type: TileType.MEGA});
    });
});
