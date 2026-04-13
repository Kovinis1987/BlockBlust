import {GameState} from "../../assets/script/gameplay/types/GameState";
import GameSessionService from "../../assets/script/gameplay/session/GameSessionService";
import GameSignals from "../../assets/script/gameplay/session/GameSignals";
import GameStateMachine from "../../assets/script/gameplay/session/GameStateMachine";
import GameStore, {DEFAULT_SHUFFLE_ATTEMPTS} from "../../assets/script/gameplay/session/GameStore";

describe("GameSessionService", () => {
    function createSession() {
        const gameSignals = new GameSignals();
        const gameStore = new GameStore(gameSignals);
        const gameStateMachine = new GameStateMachine(gameStore);
        const session = new GameSessionService(gameStore, gameSignals, gameStateMachine);
        return {gameSignals, gameStore, gameStateMachine, session};
    }

    it("resets level progress", () => {
        const {gameStore, session} = createSession();
        gameStore.setScore(999);
        gameStore.setCurrentLevel(5);

        session.resetLevel(2, 12, 3000);

        expect(gameStore.currentLevel).toBe(2);
        expect(gameStore.moves).toBe(12);
        expect(gameStore.targetScore).toBe(3000);
        expect(gameStore.score).toBe(0);
        expect(gameStore.shuffleAttempts).toBe(DEFAULT_SHUFFLE_ATTEMPTS);
        expect(gameStore.gameState).toBe(GameState.PLAYING);
    });

    it("updates score, moves and boosters", () => {
        const {gameStore, session} = createSession();

        session.addScore(100);
        session.useMove();
        session.useShuffle();
        session.useBombBooster();
        session.useTeleportBooster();
        session.grantLevelBonusBoosters(2, 1);

        expect(gameStore.score).toBe(100);
        expect(gameStore.moves).toBe(24);
        expect(gameStore.shuffleAttempts).toBe(2);
        expect(gameStore.bombBoosters).toBe(6);
        expect(gameStore.teleportBoosters).toBe(5);
    });

    it("emits flow requests", () => {
        const {gameSignals, gameStore, session} = createSession();
        const emitted: string[] = [];

        gameSignals.on(GameSignals.EVT_RESTART, () => emitted.push(GameSignals.EVT_RESTART));
        gameSignals.on(GameSignals.EVT_CONTINUE, () => emitted.push(GameSignals.EVT_CONTINUE));
        gameSignals.on(GameSignals.EVT_NEXT_LEVEL, () => emitted.push(GameSignals.EVT_NEXT_LEVEL));

        session.requestRestart();
        session.requestContinue();
        session.goToNextLevel();

        expect(emitted).toEqual([
            GameSignals.EVT_RESTART,
            GameSignals.EVT_CONTINUE,
            GameSignals.EVT_NEXT_LEVEL
        ]);
        expect(gameStore.currentLevel).toBe(1);
    });

    it("evaluates win and lose rules", () => {
        const {gameStore, session} = createSession();

        gameStore.setTargetScore(100);
        gameStore.setScore(100);
        expect(session.checkWinCondition()).toBe(true);
        expect(gameStore.gameState).toBe(GameState.WIN);

        gameStore.setGameState(GameState.PLAYING);
        gameStore.setScore(50);
        gameStore.setMoves(0);
        expect(session.checkLoseCondition()).toBe(true);
        expect(gameStore.gameState).toBe(GameState.LOST);
    });
});
