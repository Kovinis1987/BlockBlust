export default class GridModel {
    private grid: number[][] = [];
    private rows: number;
    private cols: number;

    constructor(rows: number, cols: number) {
        this.rows = rows;
        this.cols = cols;
        this.initEmptyGrid();
    }

    private initEmptyGrid() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = -1; // -1 означает пустую ячейку
            }
        }
    }

    public setTile(r: number, c: number, type: number) {
        this.grid[r][c] = type;
    }

    public getTile(r: number, c: number): number {
        return this.grid[r][c];
    }

    /**
     * Поиск группы одного цвета (BFS)
     */
    public findGroup(row: number, col: number): { r: number, c: number }[] {
        const targetColor = this.grid[row][col];
        if (targetColor === -1) return [];

        const group: { r: number, c: number }[] = [];
        const queue: { r: number, c: number }[] = [{ r: row, c: col }];
        const visited = new Set<string>();

        visited.add(`${row},${col}`);

        while (queue.length > 0) {
            const cell = queue.shift();
            group.push(cell);

            // Соседи: вверх, вниз, влево, вправо
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

    /**
     * Пометка ячеек как пустых после взрыва
     */
    public clearCells(group: { r: number, c: number }[]) {
        group.forEach(cell => {
            this.grid[cell.r][cell.c] = -1;
        });
    }

    /**
     * Логика перемещения тайлов вниз (гравитация)
     * Возвращает массив перемещений {откуда -> куда}
     */
    public processFalling(): { from: { r: number, c: number }, to: { r: number, c: number } }[] {
        const movements = [];
        for (let c = 0; c < this.cols; c++) {
            let emptySpots = 0;
            for (let r = 0; r < this.rows; r++) {
                if (this.grid[r][c] === -1) {
                    emptySpots++;
                } else if (emptySpots > 0) {
                    // Перемещаем значение в модели
                    const tileType = this.grid[r][c];
                    this.grid[r - emptySpots][c] = tileType;
                    this.grid[r][c] = -1;

                    movements.push({
                        from: { r, c },
                        to: { r: r - emptySpots, c }
                    });
                }
            }
        }
        return movements;
    }

    /**
     * Заполнение пустых мест новыми случайными тайлами
     * Возвращает список новых тайлов для отрисовки
     */
    public fillEmptyCells(): { r: number, c: number, type: number }[] {
        const newTiles = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === -1) {
                    const randomType = Math.floor(Math.random() * 5); // 5 цветов
                    this.grid[r][c] = randomType;
                    newTiles.push({ r, c, type: randomType });
                }
            }
        }
        return newTiles;
    }
}