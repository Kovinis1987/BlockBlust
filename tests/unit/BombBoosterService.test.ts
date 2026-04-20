import {TileType} from "../../assets/script/gameplay/types/TileType";
import BombBoosterService from "../../assets/script/gameplay/boosters/BombBoosterService";
import GameSessionService from "../../assets/script/gameplay/session/GameSessionService";
import GameSignals from "../../assets/script/gameplay/session/GameSignals";
import GameStateMachine from "../../assets/script/gameplay/session/GameStateMachine";
import GameStore from "../../assets/script/gameplay/session/GameStore";

describe("BombBoosterService", () => {
    function createSession() {
        const gameSignals = new GameSignals();
        const gameStore = new GameStore(gameSignals);
        const gameStateMachine = new GameStateMachine(gameStore);
        const gameSessionService = new GameSessionService(gameStore, gameSignals, gameStateMachine);
        return {gameStore, gameStateMachine, gameSessionService};
    }

    function createNode(type: number) {
        return {
            parent: {},
            getComponent() {
                return {
                    type,
                    destroyTile(callback: Function) {
                        callback();
                    }
                };
            }
        };
    }

    it("rejects bomb use on obstacle or empty target", () => {
        const service = new BombBoosterService();
        const {gameStateMachine, gameSessionService} = createSession();

        const context = {
            resolutionContext: {
                model: {
                    getTile: () => TileType.OBSTACLE
                },
                board: {
                    hasTileAt: () => false
                }
            },
            gameSessionService,
            gameStateMachine,
            bombRadius: 1,
            currentRows: 3,
            currentCols: 3,
        } as any;

        expect(service.tryUse(1, 1, context)).toBe(false);
    });

    it("uses bomb, awards score and finishes flow", () => {
        const service = new BombBoosterService();
        const {gameStore, gameStateMachine, gameSessionService} = createSession();
        const finished: string[] = [];
        const activated: Array<{r: number; c: number; type: number}> = [];
        const nodeMap = new Map<string, any>([
            ["1,1", createNode(TileType.RED)],
            ["1,2", createNode(TileType.ROCKET_VERTICAL)]
        ]);

        const context = {
            resolutionContext: {
                model: {
                    getTile(r: number, c: number) {
                        if (r === 1 && c === 2) {
                            return TileType.ROCKET_VERTICAL;
                        }
                        return TileType.RED;
                    },
                    clearCells() {}
                },
                gameSessionService,
                config: {
                    economy: {
                        scoreTile: 10
                    }
                },
                setProcessing() {},
                board: {
                    shakeCamera() {},
                    spawnExplosionFx() {},
                    playSound() {},
                    getScreenPosition(r: number, c: number) {
                        return {x: c, y: r};
                    },
                    toWorldPosition(pos: unknown) {
                        return pos;
                    },
                    showScore() {},
                    hasTileAt(r: number, c: number) {
                        return nodeMap.has(`${r},${c}`);
                    },
                    destroyTileAt(_r: number, _c: number, onComplete: Function) {
                        onComplete();
                        return true;
                    }
                }
            },
            gameSessionService,
            gameStateMachine,
            bombRadius: 1,
            currentRows: 3,
            currentCols: 3,
            activateBooster(r: number, c: number, type: number) {
                activated.push({r, c, type});
            },
            onFinished() {
                finished.push("done");
            }
        } as any;

        expect(service.tryUse(1, 1, context)).toBe(true);
        expect(activated).toEqual([{r: 1, c: 2, type: TileType.ROCKET_VERTICAL}]);
        expect(gameStore.score).toBe(10);
        expect(gameStore.bombBoosters).toBe(4);
        expect(finished).toEqual(["done"]);
        expect(gameStateMachine.isPlaying()).toBe(true);
    });
});
