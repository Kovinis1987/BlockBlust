export enum TileType {
    EMPTY = 0,
    OBSTACLE = 1,
    RED = 2,
    GREEN = 3,
    BLUE = 4,
    YELLOW = 5,
    ROCKET_VERTICAL = 6,
    ROCKET_HORIZONTAL = 7,
    BOMB = 8,
    MEGA = 9,
}

export const COLOR_TILES: TileType[] = [
    TileType.RED,
    TileType.GREEN,
    TileType.BLUE,
    TileType.YELLOW,
];

export const BOOSTER_TYPES: TileType[] = [
    TileType.ROCKET_VERTICAL,
    TileType.ROCKET_HORIZONTAL,
    TileType.BOMB,
    TileType.MEGA,
];
