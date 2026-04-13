export interface LevelData {
    rows: number;
    cols: number;
    moves: number;
    targetScore: number;
    tiles: number[] | null;
    bonusBombBoosters?: number;
    bonusTeleportBoosters?: number;
    startRowRocketTiles?: number;
    startColumnRocketTiles?: number;
    startBombTiles?: number;
    startMegaTiles?: number;
}
