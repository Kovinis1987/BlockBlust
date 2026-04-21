import {GameState} from "../types/GameState";
import GameSignals from "./GameSignals";

export const DEFAULT_MOVES = 25;
export const DEFAULT_SHUFFLE_ATTEMPTS = 3;
export const DEFAULT_TARGET_SCORE = 1000;
export const DEFAULT_TELEPORT_BOOSTERS = 5;
export const DEFAULT_BOMB_BOOSTERS = 5;

export default class GameStore {
    public readonly signals: GameSignals;

    private _score = 0;
    private _moves = DEFAULT_MOVES;
    private _shuffleAttempts = DEFAULT_SHUFFLE_ATTEMPTS;
    private _gameState: GameState = GameState.PLAYING;
    private _targetScore = DEFAULT_TARGET_SCORE;
    private _currentLevel = 0;
    private _teleportBoosters = DEFAULT_TELEPORT_BOOSTERS;
    private _bombBoosters = DEFAULT_BOMB_BOOSTERS;

    constructor(signals: GameSignals) {
        this.signals = signals;
    }

    public get score(): number {
        return this._score;
    }

    public get moves(): number {
        return this._moves;
    }

    public get shuffleAttempts(): number {
        return this._shuffleAttempts;
    }

    public get gameState(): GameState {
        return this._gameState;
    }

    public get targetScore(): number {
        return this._targetScore;
    }

    public get currentLevel(): number {
        return this._currentLevel;
    }

    public get teleportBoosters(): number {
        return this._teleportBoosters;
    }

    public get bombBoosters(): number {
        return this._bombBoosters;
    }

    public setScore(value: number): void {
        this._score = Math.max(0, value);
        this.signals.emit(GameSignals.EVT_SCORE_CHANGED, this._score);
    }

    public setMoves(value: number): void {
        this._moves = Math.max(0, value);
        this.signals.emit(GameSignals.EVT_MOVES_CHANGED, this._moves);
    }

    public setShuffleAttempts(value: number): void {
        this._shuffleAttempts = Math.max(0, value);
        this.signals.emit(GameSignals.EVT_SHUFFLE_CHANGED, this._shuffleAttempts);
    }

    public setGameState(value: GameState): void {
        if (this._gameState === value) {
            return;
        }

        this._gameState = value;
        this.signals.emit(GameSignals.EVT_STATE_CHANGED, this._gameState);
    }

    public setTargetScore(value: number): void {
        this._targetScore = Math.max(0, value);
    }

    public setCurrentLevel(value: number): void {
        this._currentLevel = Math.max(0, value);
    }

    public setTeleportBoosters(value: number): void {
        this._teleportBoosters = Math.max(0, value);
        this.signals.emit(GameSignals.EVT_TELEPORT_CHANGED, this._teleportBoosters);
    }

    public setBombBoosters(value: number): void {
        this._bombBoosters = Math.max(0, value);
        this.signals.emit(GameSignals.EVT_BOMB_CHANGED, this._bombBoosters);
    }
}
