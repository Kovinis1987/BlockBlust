import BoardStateValidationService from "../../assets/Script/Gameplay/Board/BoardStateValidationService";

function createTileNode(row: number, col: number, type: number) {
    return {
        getComponent() {
            return {
                gridPos: {x: col, y: row},
                type
            };
        }
    };
}

describe("BoardStateValidationService", () => {
    it("accepts synchronized board state", () => {
        const service = new BoardStateValidationService();

        const isValid = service.validate({
            model: {
                getTile(row: number, col: number) {
                    if (row === 0 && col === 0) return 2;
                    if (row === 0 && col === 1) return 3;
                    return 0;
                }
            },
            gridContainer: {
                children: [
                    createTileNode(0, 0, 2),
                    createTileNode(0, 1, 3)
                ]
            } as any,
            rows: 2,
            cols: 2
        });

        expect(isValid).toBe(true);
    });

    it("rejects missing tile node for non-empty model cell", () => {
        const service = new BoardStateValidationService();

        const isValid = service.validate({
            model: {
                getTile(row: number, col: number) {
                    return row === 0 && col === 0 ? 2 : 0;
                }
            },
            gridContainer: {
                children: []
            } as any,
            rows: 1,
            cols: 1
        });

        expect(isValid).toBe(false);
    });

    it("rejects duplicate tile nodes on the same coordinates", () => {
        const service = new BoardStateValidationService();

        const isValid = service.validate({
            model: {
                getTile() {
                    return 2;
                }
            },
            gridContainer: {
                children: [
                    createTileNode(0, 0, 2),
                    createTileNode(0, 0, 2)
                ]
            } as any,
            rows: 1,
            cols: 1
        });

        expect(isValid).toBe(false);
    });
});
