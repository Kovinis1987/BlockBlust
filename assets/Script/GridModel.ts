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
        // Препятствия (1) и пустые (-1) не образуют группы для взрыва
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
            // Очищаем только если это не препятствие (на всякий случай)
            if (this.grid[cell.r][cell.c] !== 1) {
                this.grid[cell.r][cell.c] = -1;
            }
        });
    }

    /**
     * Гравитация: тайлы падают только в пустые ячейки (-1),
     * пролетая мимо препятствий (1).
     */
    public processFalling(): { from: { r: number, c: number }, to: { r: number, c: number } }[] {
        const movements = [];
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                // Если нашли пустую ячейку, ищем ближайший тайл ВЫШЕ неё
                if (this.grid[r][c] === -1) {
                    for (let nextR = r + 1; nextR < this.rows; nextR++) {
                        const tileType = this.grid[nextR][c];
                        if (tileType === 1) continue; // Пропускаем препятствие
                        if (tileType !== -1) {
                            // Нашли тайл, перемещаем его в текущую пустую ячейку r
                            this.grid[r][c] = tileType;
                            this.grid[nextR][c] = -1;
                            movements.push({
                                from: { r: nextR, c },
                                to: { r, c }
                            });
                            break; // Тайл упал, переходим к следующей ячейке r
                        }
                    }
                }
            }
        }
        return movements;
    }

    /**
     * Заполнение: создаем новые тайлы (ID 2-5) только в пустых ячейках (-1)
     */
    public fillEmptyCells(): { r: number, c: number, type: number }[] {
        const newTiles = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === -1) {
                    // Генерируем ID от 2 до 5 (ваши 4 цвета)
                    const randomType = Math.floor(Math.random() * 4) + 2;
                    this.grid[r][c] = randomType;
                    newTiles.push({ r, c, type: randomType });
                }
            }
        }
        return newTiles;
    }

    public hasAvailableMoves(minGroup: number): boolean {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const type = this.grid[r][c];
                // Если это бустер (6-10), ход есть
                if (type >= 6 && type <= 10) return true;
                // Если это обычный тайл, проверяем размер группы
                if (type >= 2 && this.findGroup(r, c).length >= minGroup) return true;
            }
        }
        return false;
    }

    public shuffleOnlyColors() {
        // Собираем все цветовые тайлы (ID 2-5), перемешиваем и расставляем обратно
        let colors: number[] = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] >= 2 && this.grid[r][c] <= 5) {
                    colors.push(this.grid[r][c]);
                }
            }
        }

        // Алгоритм Фишера-Йетса
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

}
