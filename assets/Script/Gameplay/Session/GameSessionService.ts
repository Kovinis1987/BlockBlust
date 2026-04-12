import GameSignals from "./GameSignals";
import GameStateMachine from "./GameStateMachine";
import GameStore, {DEFAULT_SHUFFLE_ATTEMPTS} from "./GameStore";

export default class GameSessionService {
    constructor(
        private readonly gameStore: GameStore,
        private readonly gameSignals: GameSignals,
        private readonly gameStateMachine: GameStateMachine
    ) {
    }

    public resetLevel(level: number, moves: number, targetScore: number): void {
        this.gameStore.setCurrentLevel(level);
        this.gameStore.setMoves(moves);
        this.gameStore.setTargetScore(targetScore);
        this.gameStore.setScore(0);
        this.gameStore.setShuffleAttempts(DEFAULT_SHUFFLE_ATTEMPTS);
        this.gameStateMachine.enterPlaying();
        this.gameStore.setTeleportBoosters(this.gameStore.teleportBoosters);
        this.gameStore.setBombBoosters(this.gameStore.bombBoosters);
    }

    public grantLevelBonusBoosters(bombBoosters: number, teleportBoosters: number): void {
        if (bombBoosters > 0) {
            this.gameStore.setBombBoosters(this.gameStore.bombBoosters + bombBoosters);
        }

        if (teleportBoosters > 0) {
            this.gameStore.setTeleportBoosters(this.gameStore.teleportBoosters + teleportBoosters);
        }
    }

    public continueGame(extraMoves: number): void {
        this.gameStore.setMoves(this.gameStore.moves + extraMoves);
        this.gameStateMachine.enterPlaying();
    }

    public requestRestart(): void {
        this.gameSignals.emit(GameSignals.EVT_RESTART);
    }

    public requestContinue(): void {
        this.gameSignals.emit(GameSignals.EVT_CONTINUE);
    }

    public goToNextLevel(): void {
        this.gameStore.setCurrentLevel(this.gameStore.currentLevel + 1);
        this.gameSignals.emit(GameSignals.EVT_NEXT_LEVEL);
    }

    public addScore(amount: number): void {
        this.gameStore.setScore(this.gameStore.score + amount);
    }

    public useMove(): void {
        if (this.gameStore.moves <= 0) {
            return;
        }

        this.gameStore.setMoves(this.gameStore.moves - 1);
    }

    public useShuffle(): boolean {
        if (this.gameStore.shuffleAttempts <= 0) {
            return false;
        }

        this.gameStore.setShuffleAttempts(this.gameStore.shuffleAttempts - 1);
        return true;
    }

    public useBombBooster(): boolean {
        if (this.gameStore.bombBoosters <= 0) {
            return false;
        }

        this.gameStore.setBombBoosters(this.gameStore.bombBoosters - 1);
        return true;
    }

    public useTeleportBooster(): boolean {
        if (this.gameStore.teleportBoosters <= 0) {
            return false;
        }

        this.gameStore.setTeleportBoosters(this.gameStore.teleportBoosters - 1);
        return true;
    }

    public checkWinCondition(): boolean {
        if (this.gameStore.score < this.gameStore.targetScore || !this.gameStateMachine.isPlaying()) {
            return false;
        }

        this.gameStateMachine.enterWin();
        return true;
    }

    public checkLoseCondition(): boolean {
        const hasMoves = this.gameStore.moves > 0;
        const reachedTarget = this.gameStore.score >= this.gameStore.targetScore;
        if (hasMoves || reachedTarget || !this.gameStateMachine.isPlaying()) {
            return false;
        }

        this.gameStateMachine.enterLose();
        return true;
    }
}
