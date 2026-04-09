import BoosterResolutionService from "../Service/BoosterResolutionService";
import EffectTypes from "../Enum/EffectTypes";
import {TileType} from "../Enum/TileType";

const {ccclass, property} = cc._decorator;

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`[BoosterResolutionServiceTests] ${message}`);
    }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
    assert(actual === expected, `${message}. expected=${expected}, actual=${actual}`);
}

export function runBoosterResolutionServiceTests() {
    const grid = [
        [TileType.RED, TileType.ROCKET_VERTICAL, TileType.BLUE],
        [TileType.GREEN, TileType.BOMB, TileType.YELLOW],
        [TileType.RED, TileType.MEGA, TileType.BLUE],
    ];

    const getTile = (r: number, c: number) => grid[r][c];

    const neighbor = BoosterResolutionService.findNeighborBooster(1, 1, 3, 3, getTile);
    assert(neighbor !== null, "findNeighborBooster should find adjacent booster");
    assertEqual(neighbor!.type, TileType.MEGA, "findNeighborBooster returns expected type");

    const noNeighbor = BoosterResolutionService.findNeighborBooster(0, 0, 3, 3, getTile);
    assertEqual(noNeighbor, null, "findNeighborBooster returns null when none");

    const singleRocket = BoosterResolutionService.buildSinglePlan(1, 1, TileType.ROCKET_VERTICAL, 4, 5, 1);
    assertEqual(singleRocket.fxType, EffectTypes.ROCKET_VERTICAL, "single rocket fx type");
    assertEqual(singleRocket.affected.length, 5, "single rocket affected width");

    const singleBomb = BoosterResolutionService.buildSinglePlan(1, 1, TileType.BOMB, 4, 4, 1);
    assertEqual(singleBomb.fxType, EffectTypes.BOMB, "single bomb fx type");
    assertEqual(singleBomb.affected.length, 9, "single bomb radius area");

    const comboRR = BoosterResolutionService.buildComboPlan(
        1, 1, TileType.ROCKET_VERTICAL, TileType.ROCKET_HORIZONTAL, 4, 4, 1
    );
    assertEqual(comboRR.playCrossFx, true, "rocket+rocket should play cross fx");
    assertEqual(comboRR.fxType, EffectTypes.ROCKET_VERTICAL, "rocket+rocket fx type");

    const comboBB = BoosterResolutionService.buildComboPlan(
        1, 1, TileType.BOMB, TileType.MEGA, 4, 4, 1
    );
    assertEqual(comboBB.preExplosionFxType, EffectTypes.BOMB, "bomb+mega pre fx");
    assertEqual(comboBB.fxType, EffectTypes.MEGA, "bomb+mega final fx");

    const comboRB = BoosterResolutionService.buildComboPlan(
        1, 1, TileType.ROCKET_VERTICAL, TileType.BOMB, 4, 4, 1
    );
    assertEqual(comboRB.preExplosionFxType, EffectTypes.ROCKET_HORIZONTAL, "rocket+bomb pre fx");
    assertEqual(comboRB.fxType, EffectTypes.BOMB, "rocket+bomb final fx");

    const coords = [{r: 2, c: 2}, {r: 1, c: 1}, {r: 2, c: 2}, {r: 0, c: 0}];
    const deduped = BoosterResolutionService.removeDuplicates(coords);
    assertEqual(deduped.length, 3, "removeDuplicates length");

    const sorted = [{r: 2, c: 2}, {r: 0, c: 0}, {r: 1, c: 1}];
    BoosterResolutionService.sortCoordsByEpicenter(sorted, {r: 1, c: 1});
    assertEqual(sorted[0].r, 1, "sortCoordsByEpicenter first row");
    assertEqual(sorted[0].c, 1, "sortCoordsByEpicenter first col");
}

@ccclass
export default class BoosterResolutionServiceTests extends cc.Component {
    @property
    runOnLoad: boolean = true;

    onLoad() {
        if (!this.runOnLoad) return;

        runBoosterResolutionServiceTests();
        cc.log("[BoosterResolutionServiceTests] all tests passed");
    }
}
