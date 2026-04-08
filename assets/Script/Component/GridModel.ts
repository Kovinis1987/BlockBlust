import GameConfig from "../Config/GameConfig";
import {BOOSTER_TYPES, COLOR_TILES, TileType} from "../Enum/TileType";

export default class GridModel {
    private grid: number[][] = [];
    private rows: number;
    private cols: number;
    private config: GameConfig;

    constructor(rows: number, cols: number, config: GameConfig) {
        this.rows = rows;
        this.cols = cols;
        this.config = config; // Сохраняем ссылку
        this.initEmptyGrid();
    }

    private initEmptyGrid() {
        this.grid = Array(this.rows).fill(null).map(() =>
            Array(this.cols).fill(TileType.EMPTY)
        );
    }

    public setTile(r: number, c: number, type: TileType) {
        if (this.isValid(r, c)) {
            this.grid[r][c] = type;
        }
    }

    public getTile(r: number, c: number): TileType {
        return this.isValid(r, c) ? this.grid[r][c] : TileType.EMPTY;
    }

    public findGroup(row: number, col: number): { r: number, c: number }[] {
        const targetColor = this.grid[row][col];
        if (targetColor === TileType.EMPTY || targetColor === TileType.OBSTACLE) return [];

        const group: { r: number, c: number }[] = [];
        const queue: { r: number, c: number }[] = [{ r: row, c: col }];
        const visited = new Set<string>();
        visited.add(`${row},${col}`);

        while (queue.length > 0) {
            const cell = queue.shift()!;
            group.push(cell);

            const neighbors = [
                { r: cell.r + 1, c: cell.c }, { r: cell.r - 1, c: cell.c },
                { r: cell.r, c: cell.c + 1 }, { r: cell.r, c: cell.c - 1 }
            ];

            for (const n of neighbors) {
                const key = `${n.r},${n.c}`;
                if (n.r >= 0 && n.r < this.rows && n.c >= 0 && n.c < this.cols &&
                    this.grid[n.r][n.c] === targetColor && !visited.has(key)) {
                    visited.add(key);
                    queue.push(n);
                }
            }
        }
        return group;
    }

    public clearCells(group: { r: number, c: number }[] = []) {
        for (const cell of group) {
            if (this.isValid(cell.r, cell.c)) {
                const type = this.grid[cell.r][cell.c];
                if (type !== TileType.OBSTACLE && type > 1) {
                    this.grid[cell.r][cell.c] = TileType.EMPTY;
                }
            }
        }
    }

    public processFalling(): { from: { r: number, c: number }, to: { r: number, c: number } }[] {
        const movements: { from: { r: number, c: number }, to: { r: number, c: number } }[] = [];
        let moved = true;

        while (moved) {
            moved = false;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.grid[r][c] !== TileType.EMPTY) continue;

                    let foundVertical = false;
                    for (let nextR = r + 1; nextR < this.rows; nextR++) {
                        const tileAbove = this.grid[nextR][c];
                        if (tileAbove === TileType.OBSTACLE) break;
                        if (COLOR_TILES.includes(tileAbove) || BOOSTER_TYPES.includes(tileAbove)) {
                            this.moveTile(nextR, c, r, c, movements);
                            moved = true;
                            foundVertical = true;
                            break;
                        }
                    }
                    if (foundVertical) continue;

                    if (r + 1 < this.rows && this.grid[r + 1][c] === TileType.OBSTACLE) {
                        for (const step of [-1, 1]) {
                            const sideCol = c + step;
                            if (sideCol >= 0 && sideCol < this.cols) {
                                const sideTile = this.grid[r + 1][sideCol];
                                if (COLOR_TILES.includes(sideTile) || BOOSTER_TYPES.includes(sideTile)) {
                                    this.moveTile(r + 1, sideCol, r, c, movements);
                                    moved = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        return movements;
    }

    private moveTile(fromR: number, fromC: number, toR: number, toC: number, movements: any[]) {
        if (this.grid[fromR][fromC] === TileType.OBSTACLE || this.grid[toR][toC] === TileType.OBSTACLE) return;
        this.grid[toR][toC] = this.grid[fromR][fromC];
        this.grid[fromR][fromC] = TileType.EMPTY;
        movements.push({ from: { r: fromR, c: fromC }, to: { r: toR, c: toC } });
    }

    public fillEmptyCells(): { r: number; c: number; type: TileType }[] {
        const newTiles: { r: number; c: number; type: TileType }[] = [];
        for (let c = 0; c < this.cols; c++) {
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c] === TileType.EMPTY) {
                    const colors = [TileType.RED, TileType.GREEN, TileType.BLUE, TileType.YELLOW];
                    const colorID = colors[Math.floor(Math.random() * colors.length)];
                    this.grid[r][c] = colorID;
                    newTiles.push({ r, c, type: colorID });
                }
            }
        }
        return newTiles;
    }

    public hasAvailableMoves(minGroup: number): boolean {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const type = this.grid[r][c];
                if (BOOSTER_TYPES.includes(type)) return true;
                if (COLOR_TILES.includes(type) && this.findGroup(r, c).length >= minGroup) return true;
            }
        }
        return false;
    }

    public shuffleOnlyColors() {
        const colors: TileType[] = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (COLOR_TILES.includes(this.grid[r][c])) {
                    colors.push(this.grid[r][c]);
                }
            }
        }

        for (let i = colors.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [colors[i], colors[j]] = [colors[j], colors[i]];
        }

        let idx = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (COLOR_TILES.includes(this.grid[r][c])) {
                    this.grid[r][c] = colors[idx++];
                }
            }
        }
    }

    public getBoosterType(group: { r: number, c: number }[]): { type: TileType, orientation?: 'h' | 'v' } | null {
        const count = group.length;
        const { rocketMin, bombMin, megaMin } = this.config.economy;

        if (count < rocketMin) return null;

        let minR = group[0].r, maxR = group[0].r;
        let minC = group[0].c, maxC = group[0].c;
        for (const cell of group) {
            minR = Math.min(minR, cell.r);
            maxR = Math.max(maxR, cell.r);
            minC = Math.min(minC, cell.c);
            maxC = Math.max(maxC, cell.c);
        }

        const height = maxR - minR + 1;
        const width = maxC - minC + 1;

        let type: TileType;
        if (count >= megaMin) {
            type = TileType.MEGA;
        } else if (count >= bombMin) {
            type = TileType.BOMB;
        } else {
            type = height > width ? TileType.ROCKET_HORIZONTAL : TileType.ROCKET_VERTICAL;
        }

        return { type };
    }

    public isColorTile(type: TileType): boolean {
        return COLOR_TILES.includes(type);
    }

    public isBooster(type: TileType): boolean {
        return BOOSTER_TYPES.includes(type);
    }

    public isEmpty(r: number, c: number): boolean {
        return this.getTile(r, c) === TileType.EMPTY;
    }

    public isObstacle(r: number, c: number): boolean {
        return this.getTile(r, c) === TileType.OBSTACLE;
    }
    private isValid(r: number, c: number): boolean {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }
    
    
}
