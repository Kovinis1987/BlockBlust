import GameConfig from "./Config/GameConfig";

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
            // Очищаем ТОЛЬКО если это не стена
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
                    // ПРАВИЛО 1: Мы работаем ТОЛЬКО с пустыми ячейками (-1)
                    // Если тут препятствие (1) или тайл (>1), идем дальше
                    if (this.grid[r][c] !== -1) continue;

                    // ПРАВИЛО 2: Вертикальное падение (приоритет)
                    let foundVertical = false;
                    for (let nextR = r + 1; nextR < this.rows; nextR++) {
                        const tileAbove = this.grid[nextR][c];

                        if (tileAbove === 1) break; // СТЕНА! Выше нее по вертикали ничего не упадет сюда

                        if (tileAbove > 1) { // Нашли кубик или бустер
                            this.moveTile(nextR, c, r, c, movements);
                            moved = true;
                            foundVertical = true;
                            break;
                        }
                    }

                    if (foundVertical) continue;

                    // ПРАВИЛО 3: Диагональное обтекание (только если прямо сверху ПРЕПЯТСТВИЕ)
                    // Если прямо над нами (r+1) стоит 1, пробуем взять из (r+1, c-1) или (r+1, c+1)
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
        // ПРАВИЛО 4: Никогда не перемещаем препятствия
        if (this.grid[fromR][fromC] === 1 || this.grid[toR][toC] === 1) return;

        this.grid[toR][toC] = this.grid[fromR][fromC];
        this.grid[fromR][fromC] = -1; // Старое место становится пустым
        movements.push({ from: { r: fromR, c: fromC }, to: { r: toR, c: toC } });
    }

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

    public getBoosterType(group: { r: number, c: number }[]): { type: number, orientation?: 'h' | 'v' } | null {
        const count = group.length;
        // Теперь берем данные из нашего Scriptable Object
        const { rocketMin, bombMin, megaMin } = this.config.economy;

        if (count >= rocketMin && count < bombMin) return { type: 6 };
        if (count >= bombMin && count < megaMin) return { type: 8 };
        if (count >= megaMin) return { type: 9 };
        return null;
    }

}
