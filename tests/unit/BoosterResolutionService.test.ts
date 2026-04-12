import EffectTypes from "../../assets/Script/Gameplay/Types/EffectTypes";
import {TileType} from "../../assets/Script/Gameplay/Types/TileType";
import BoosterResolutionService from "../../assets/Script/Gameplay/Boosters/BoosterResolutionService";

describe("BoosterResolutionService", () => {
    const grid = [
        [TileType.RED, TileType.ROCKET_VERTICAL, TileType.BLUE],
        [TileType.GREEN, TileType.BOMB, TileType.YELLOW],
        [TileType.RED, TileType.MEGA, TileType.BLUE]
    ];

    const getTile = (r: number, c: number) => grid[r][c];

    it("finds adjacent booster", () => {
        expect(BoosterResolutionService.findNeighborBooster(1, 1, 3, 3, getTile)).toEqual({
            r: 2,
            c: 1,
            type: TileType.MEGA
        });

        const plainGrid = [
            [TileType.RED, TileType.BLUE],
            [TileType.GREEN, TileType.YELLOW]
        ];
        expect(BoosterResolutionService.findNeighborBooster(0, 0, 2, 2, (r, c) => plainGrid[r][c])).toBeNull();
    });

    it("builds single plans", () => {
        const rocketPlan = BoosterResolutionService.buildSinglePlan(1, 1, TileType.ROCKET_VERTICAL, 4, 5, 1);
        expect(rocketPlan.fxType).toBe(EffectTypes.ROCKET_VERTICAL);
        expect(rocketPlan.affected).toEqual([
            {r: 1, c: 0},
            {r: 1, c: 1},
            {r: 1, c: 2},
            {r: 1, c: 3},
            {r: 1, c: 4}
        ]);

        const columnRocketPlan = BoosterResolutionService.buildSinglePlan(1, 1, TileType.ROCKET_HORIZONTAL, 4, 5, 1);
        expect(columnRocketPlan.fxType).toBe(EffectTypes.ROCKET_HORIZONTAL);
        expect(columnRocketPlan.affected).toEqual([
            {r: 0, c: 1},
            {r: 1, c: 1},
            {r: 2, c: 1},
            {r: 3, c: 1}
        ]);

        const bombPlan = BoosterResolutionService.buildSinglePlan(1, 1, TileType.BOMB, 4, 4, 1);
        expect(bombPlan.fxType).toBe(EffectTypes.BOMB);
        expect(bombPlan.affected).toHaveLength(9);
    });

    it("builds combo plans", () => {
        const rocketCombo = BoosterResolutionService.buildComboPlan(
            1, 1, TileType.ROCKET_VERTICAL, TileType.ROCKET_HORIZONTAL, 4, 4, 1
        );
        expect(rocketCombo.playCrossFx).toBe(true);
        expect(rocketCombo.fxType).toBe(EffectTypes.ROCKET_VERTICAL);

        const bombMegaCombo = BoosterResolutionService.buildComboPlan(
            1, 1, TileType.BOMB, TileType.MEGA, 4, 4, 1
        );
        expect(bombMegaCombo.preExplosionFxType).toBe(EffectTypes.BOMB);
        expect(bombMegaCombo.fxType).toBe(EffectTypes.MEGA);

        const rocketBombCombo = BoosterResolutionService.buildComboPlan(
            1, 1, TileType.ROCKET_VERTICAL, TileType.BOMB, 4, 4, 1
        );
        expect(rocketBombCombo.preExplosionFxType).toBe(EffectTypes.ROCKET_HORIZONTAL);
        expect(rocketBombCombo.fxType).toBe(EffectTypes.BOMB);
    });

    it("removes duplicates and sorts by epicenter", () => {
        expect(BoosterResolutionService.removeDuplicates([
            {r: 2, c: 2},
            {r: 1, c: 1},
            {r: 2, c: 2},
            {r: 0, c: 0}
        ])).toEqual([
            {r: 2, c: 2},
            {r: 1, c: 1},
            {r: 0, c: 0}
        ]);

        const coords = [{r: 2, c: 2}, {r: 0, c: 0}, {r: 1, c: 1}];
        BoosterResolutionService.sortCoordsByEpicenter(coords, {r: 1, c: 1});
        expect(coords[0]).toEqual({r: 1, c: 1});
    });
});
