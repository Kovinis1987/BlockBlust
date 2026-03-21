import {GameState} from "./GameState";

export default class DataService {
    private static _instance: DataService;
    public static get instance(): DataService {
        if (!this._instance) this._instance = new DataService();
        return this._instance;
    }

    public readonly eventTarget: cc.EventTarget = new cc.EventTarget()

    public static readonly EVT_RESTART = 'request-restart';
    public static readonly EVT_CONTINUE = 'request-continue';

    // Состояние игры
    private _score: number = 0;
    private _moves: number = 25;
    private _shuffleAttempts: number = 3;
    private _gameState: GameState = GameState.PLAYING;

    // Данные уровня
    private _targetScore: number = 1000;
    private _currentLevel: number = 0;

    // Геттеры
    get score() { return this._score; }
    get moves() { return this._moves; }
    get shuffleAttempts() { return this._shuffleAttempts; }
    get gameState() { return this._gameState; }
    get targetScore() { return this._targetScore; }

    /**
     * Сброс данных при старте уровня
     */
    public resetLevel(level: number, moves: number, target: number) {
        this._currentLevel = level;
        this._moves = moves;
        this._targetScore = target;
        this._score = 0;
        this._shuffleAttempts = 3;
        this._gameState = GameState.PLAYING;

        this.notifyAll();
    }

    public addScore(amount: number) {
        this._score += amount;
        this.eventTarget.emit('score-changed', this._score);
        this.checkWinCondition();
    }

    public useMove() {
        if (this._moves > 0) {
            this._moves--;
            this.eventTarget.emit('moves-changed', this._moves);
            if (this._moves <= 0) this.checkLoseCondition();
        }
    }

    public useShuffle(): boolean {
        if (this._shuffleAttempts > 0) {
            this._shuffleAttempts--;
            this.eventTarget.emit('shuffle-changed', this._shuffleAttempts);
            return true;
        }
        return false;
    }

    public setGameState(state: GameState) {
        this._gameState = state;
        this.eventTarget.emit('state-changed', this._gameState);
    }

    private checkWinCondition() {
        if (this._score >= this._targetScore && this._gameState === GameState.PLAYING) {
            this.setGameState(GameState.WON);
        }
    }

    private checkLoseCondition() {
        if (this._score < this._targetScore && this._moves <= 0) {
            this.setGameState(GameState.LOST);
        }
    }

    private notifyAll() {
        this.eventTarget.emit('score-changed', this._score);
        this.eventTarget.emit('moves-changed', this._moves);
        this.eventTarget.emit('shuffle-changed', this._shuffleAttempts);
        this.eventTarget.emit('state-changed', this._gameState);
    }

    nextLevel() {
        this._currentLevel++;
    }
}
