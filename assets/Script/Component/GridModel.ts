import GameConfig from "../Config/GameConfig";

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
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = -1;
            }
        }
    }

    public setTile(r: number, c: number, type: number) {
        this.grid[r][c] = type;
    }

    public getTile(r: number, c: number): number {
        return this.grid[r][c];
    }

    public findGroup(row: number, col: number): { r: number, c: number }[] {
        const targetColor = this.grid[row][col];
        if (targetColor === -1 || targetColor === 1) return [];

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

    public clearCells(group: { r: number, c: number }[]) {
        group.forEach(cell => {
            if (this.grid[cell.r][cell.c] > 1) { 
                this.grid[cell.r][cell.c] = -1;
            }
        });
    }

    public processFalling(): { from: { r: number, c: number }, to: { r: number, c: number } }[] {
        const movements = [];
        let moved = true;

        while (moved) {
            moved = false;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.grid[r][c] !== -1) continue;

                    let foundVertical = false;
                    for (let nextR = r + 1; nextR < this.rows; nextR++) {
                        const tileAbove = this.grid[nextR][c];

                        if (tileAbove === 1) break; 

                        if (tileAbove > 1) { 
                            this.moveTile(nextR, c, r, c, movements);
                            moved = true;
                            foundVertical = true;
                            break;
                        }
                    }

                    if (foundVertical) continue;

                    if (r + 1 < this.rows && this.grid[r + 1][c] === 1) {
                        for (let step of [-1, 1]) {
                            const sideCol = c + step;
                            if (sideCol >= 0 && sideCol < this.cols) {
                                const sideTile = this.grid[r + 1][sideCol];
                                if (sideTile > 1) {
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
        if (this.grid[fromR][fromC] === 1 || this.grid[toR][toC] === 1) return;

        this.grid[toR][toC] = this.grid[fromR][fromC];
        this.grid[fromR][fromC] = -1;
        movements.push({ from: { r: fromR, c: fromC }, to: { r: toR, c: toC } });
    }

    public fillEmptyCells(): { r: number; c: number; type: number }[] {
        const newTiles: { r: number; c: number; type: number }[] = [];
        for (let c = 0; c < this.cols; c++) {
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c] === -1) {
                    const colorID = Math.floor(Math.random() * 4) + 2;
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
                if (type >= 6 && type <= 10) return true;
                if (type >= 2 && this.findGroup(r, c).length >= minGroup) return true;
            }
        }
        return false;
    }

    public shuffleOnlyColors() {
        let colors: number[] = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] >= 2 && this.grid[r][c] <= 5) {
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
                if (this.grid[r][c] >= 2 && this.grid[r][c] <= 5) {
                    this.grid[r][c] = colors[idx++];
                }
            }
        }
    }

    public getBoosterType(group: { r: number, c: number }[]): { type: number, orientation?: 'h' | 'v' } | null {
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

        let type: number;
        let orientation: 'h' | 'v' | undefined;

        if (count >= megaMin) {
            type = 9;
        } else if (count >= bombMin) {
            type = 8;
        } else if (count >= rocketMin) {
            if (height > width) {
                type = 7;
                orientation = 'v';
            } else {
                type = 6;
                orientation = 'h';
            }
        }

        return { type, orientation };
    }
    
    
}
