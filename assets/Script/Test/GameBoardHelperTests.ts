import GameBoardHelper from "../Service/GameBoardHelper";
import EffectTypes from "../Enum/EffectTypes";
import {TileType} from "../Enum/TileType";

const {ccclass, property} = cc._decorator;

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`[GameBoardHelperTests] ${message}`);
    }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
    assert(actual === expected, `${message}. expected=${expected}, actual=${actual}`);
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    assert(actualStr === expectedStr, `${message}. expected=${expectedStr}, actual=${actualStr}`);
}

export function runGameBoardHelperTests() {
    assertEqual(GameBoardHelper.isInsideGrid(0, 0, 3, 3), true, "isInsideGrid origin");
    assertEqual(GameBoardHelper.isInsideGrid(-1, 0, 3, 3), false, "isInsideGrid negative row");
    assertEqual(GameBoardHelper.isInsideGrid(2, 2, 3, 3), true, "isInsideGrid max in bounds");
    assertEqual(GameBoardHelper.isInsideGrid(3, 2, 3, 3), false, "isInsideGrid row overflow");

    assertEqual(GameBoardHelper.isBoosterType(TileType.ROCKET_VERTICAL), true, "isBoosterType rocket");
    assertEqual(GameBoardHelper.isBoosterType(TileType.MEGA), true, "isBoosterType mega");
    assertEqual(GameBoardHelper.isBoosterType(TileType.YELLOW), false, "isBoosterType color");

    assertEqual(GameBoardHelper.isObstacleType(TileType.OBSTACLE), true, "isObstacleType obstacle");
    assertEqual(GameBoardHelper.isObstacleType(TileType.EMPTY), false, "isObstacleType empty");

    assertEqual(GameBoardHelper.isColorType(TileType.RED), true, "isColorType red");
    assertEqual(GameBoardHelper.isColorType(TileType.BOMB), false, "isColorType bomb");

    assertEqual(GameBoardHelper.isRocketType(TileType.ROCKET_VERTICAL), true, "isRocketType vertical");
    assertEqual(GameBoardHelper.isRocketType(TileType.ROCKET_HORIZONTAL), true, "isRocketType horizontal");
    assertEqual(GameBoardHelper.isRocketType(TileType.BOMB), false, "isRocketType bomb");

    assertEqual(GameBoardHelper.isBombFamilyType(TileType.BOMB), true, "isBombFamilyType bomb");
    assertEqual(GameBoardHelper.isBombFamilyType(TileType.MEGA), true, "isBombFamilyType mega");
    assertEqual(GameBoardHelper.isBombFamilyType(TileType.ROCKET_HORIZONTAL), false, "isBombFamilyType rocket");

    assertDeepEqual(
        GameBoardHelper.collectRowCells(2, 4),
        [{r: 2, c: 0}, {r: 2, c: 1}, {r: 2, c: 2}, {r: 2, c: 3}],
        "collectRowCells"
    );

    assertDeepEqual(
        GameBoardHelper.collectColumnCells(1, 3),
        [{r: 0, c: 1}, {r: 1, c: 1}, {r: 2, c: 1}],
        "collectColumnCells"
    );

    assertEqual(
        GameBoardHelper.collectSquareCells(1, 1, 1, 3, 3).length,
        9,
        "collectSquareCells center area"
    );

    assertDeepEqual(
        GameBoardHelper.collectSquareCells(0, 0, 1, 3, 3),
        [{r: 0, c: 0}, {r: 0, c: 1}, {r: 1, c: 0}, {r: 1, c: 1}],
        "collectSquareCells corner clipping"
    );

    const all = GameBoardHelper.collectAllCells(2, 3);
    assertEqual(all.length, 6, "collectAllCells size");
    assertDeepEqual(all[0], {r: 0, c: 0}, "collectAllCells first item");
    assertDeepEqual(all[5], {r: 1, c: 2}, "collectAllCells last item");

    assertEqual(
        GameBoardHelper.getEffectTypeForTile(TileType.ROCKET_VERTICAL),
        EffectTypes.ROCKET_VERTICAL,
        "getEffectTypeForTile vertical rocket"
    );
    assertEqual(
        GameBoardHelper.getEffectTypeForTile(TileType.ROCKET_HORIZONTAL),
        EffectTypes.ROCKET_HORIZONTAL,
        "getEffectTypeForTile horizontal rocket"
    );
    assertEqual(
        GameBoardHelper.getEffectTypeForTile(TileType.BOMB),
        EffectTypes.BOMB,
        "getEffectTypeForTile bomb"
    );
    assertEqual(
        GameBoardHelper.getEffectTypeForTile(TileType.MEGA),
        EffectTypes.BOMB,
        "getEffectTypeForTile mega"
    );
    assertEqual(
        GameBoardHelper.getEffectTypeForTile(TileType.GREEN),
        EffectTypes.TILE_NORMAL,
        "getEffectTypeForTile color"
    );
}

@ccclass
export default class GameBoardHelperTests extends cc.Component {
    @property
    runOnLoad: boolean = true;

    onLoad() {
        if (!this.runOnLoad) return;

        runGameBoardHelperTests();
        cc.log("[GameBoardHelperTests] all tests passed");
    }
}
