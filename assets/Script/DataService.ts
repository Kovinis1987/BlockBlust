import {GameState} from "./Enum/GameState";

export default class DataService {
    private static _instance: DataService;
    public static get instance(): DataService {
        if (!this._instance) this._instance = new DataService();
        return this._instance;
    }

    public readonly eventTarget: cc.EventTarget = new cc.EventTarget()

    public static readonly EVT_RESTART = 'request-restart';
    public static readonly EVT_CONTINUE = 'request-continue';
    public static readonly EVT_NEXT_LEVEL = 'request-next-level';
    public static readonly EVT_LEVEL_LOADED = 'level-loaded';
    public static readonly EVT_BOOSTER_TELEPORT = 'booster-teleport-toggle';
    public static readonly EVT_BOOSTER_BOMB = 'booster-bomb-toggle';
    public static readonly EVT_STATE_CHANGED = 'state-changed';

    private _score: number = 0;
    private _moves: number = 25;
    private _shuffleAttempts: number = 3;
    private _gameState: GameState = GameState.PLAYING;

    private _targetScore: number = 1000;
    private _currentLevel: number = 0;
    private _rows: number = 8;
    private _cols: number = 8;
    private _tilesData: number[] | null = null;

    private _teleportBoosters: number = 5;
    private _bombBoosters: number = 5;

    get score() { return this._score; }
    get moves() { return this._moves; }
    get gameState() { return this._gameState; }
    get targetScore() { return this._targetScore; }
    get currentLevel() { return this._currentLevel; }
    set currentLevel(value: number) { this._currentLevel = value; }
    get rows() { return this._rows; }
    get cols() { return this._cols; }
    get teleportBoosters(): number { return this._teleportBoosters; }
    set teleportBoosters(value: number) {
        this._teleportBoosters = Math.max(0, value);
        this.eventTarget.emit('teleport-changed', this._teleportBoosters);
    }

    get bombBoosters(): number { return this._bombBoosters; }
    private set bombBoosters(value: number) {
        this._bombBoosters = value;
    }

    public resetLevel(level: number, moves: number, target: number) {
        this._currentLevel = level;
        this._moves = moves;
        this._targetScore = target;
        this._score = 0;
        this._shuffleAttempts = 3;
        this._gameState = GameState.PLAYING;
        this.eventTarget.emit('teleport-changed', this._teleportBoosters);
        this.eventTarget.emit('score-changed', this._score);
        this.eventTarget.emit('moves-changed', this._moves);
        this.eventTarget.emit('shuffle-changed', this._shuffleAttempts);
        this.eventTarget.emit('state-changed', this._gameState);
        this.eventTarget.emit(DataService.EVT_LEVEL_LOADED, level);
    }

    public continueGame(extraMoves: number) {
        this._moves += extraMoves;
        this._gameState = GameState.PLAYING;

        this.eventTarget.emit('moves-changed', this._moves);
        this.eventTarget.emit('state-changed', this._gameState);
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

    public useBombBooster(): boolean {
        if (this.bombBoosters > 0) {
            this.bombBoosters--;
            // this.eventTarget.emit('bomb-changed', this.bombBoosters);
            return true;
        }
        return false;
    }

    public setGameState(state: GameState) {
        this._gameState = state;
        this.eventTarget.emit('state-changed', this._gameState);
    }

    public nextLevel() {
        this._currentLevel++;
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
}
