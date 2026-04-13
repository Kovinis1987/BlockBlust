import {GameState} from "../../assets/script/gameplay/types/GameState";
import GameProgressionService from "../../assets/script/gameplay/flow/GameProgressionService";
import GameSessionService from "../../assets/script/gameplay/session/GameSessionService";
import GameSignals from "../../assets/script/gameplay/session/GameSignals";
import GameStateMachine from "../../assets/script/gameplay/session/GameStateMachine";
import GameStore from "../../assets/script/gameplay/session/GameStore";

describe("GameProgressionService", () => {
    function createContext(overrides: Partial<any> = {}) {
        const gameSignals = new GameSignals();
        const gameStore = new GameStore(gameSignals);
        const gameStateMachine = new GameStateMachine(gameStore);
        const gameSessionService = new GameSessionService(gameStore, gameSignals, gameStateMachine);
        const progressionService = new GameProgressionService();
        const flags = {
            shuffled: 0,
            processing: [] as boolean[]
        };

        const context = {
            model: {
                hasAvailableMoves: () => true
            },
            gameStore,
            gameSessionService,
            gameStateMachine,
            minMatch: 3,
            continueMoves: 5,
            setProcessing: (value: boolean) => flags.processing.push(value),
            shuffleGrid: () => {
                flags.shuffled++;
            },
            ...overrides
        };

        return {progressionService, gameStore, gameSessionService, gameStateMachine, context, flags};
    }

    it("continues game and shuffles when no moves remain", () => {
        const {progressionService, gameStore, context, flags} = createContext({
            model: {
                hasAvailableMoves: () => false
            }
        });

        progressionService.handleContinue(context);

        expect(gameStore.moves).toBe(30);
        expect(flags.shuffled).toBe(1);
    });

    it("returns early when lose condition is met", () => {
        const {progressionService, gameStore, context, flags} = createContext();
        gameStore.setScore(10);
        gameStore.setTargetScore(100);
        gameStore.setMoves(0);

        expect(progressionService.checkPossibleMoves(context)).toBe(true);
        expect(gameStore.gameState).toBe(GameState.LOST);
        expect(flags.shuffled).toBe(0);
    });

    it("uses shuffle when there are no available moves", () => {
        const {progressionService, context, flags} = createContext({
            model: {
                hasAvailableMoves: () => false
            }
        });

        expect(progressionService.checkPossibleMoves(context)).toBe(true);
        expect(flags.shuffled).toBe(1);
    });

    it("enters lose when there are no moves and no shuffles left", () => {
        const {progressionService, gameStore, context, flags} = createContext({
            model: {
                hasAvailableMoves: () => false
            }
        });

        gameStore.setMoves(1);
        gameStore.setTargetScore(100);
        gameStore.setScore(10);
        gameStore.setShuffleAttempts(0);
        context.gameSessionService.useMove();

        expect(progressionService.checkPossibleMoves(context)).toBe(true);
        expect(gameStore.gameState).toBe(GameState.LOST);
        expect(flags.shuffled).toBe(0);
    });

    it("finalizes physics and checks win before lose", () => {
        const {progressionService, gameStore, context, flags} = createContext();
        gameStore.setTargetScore(100);
        gameStore.setScore(100);

        progressionService.finalizePhysics(context);

        expect(flags.processing).toEqual([false]);
        expect(gameStore.gameState).toBe(GameState.WIN);
    });
});
