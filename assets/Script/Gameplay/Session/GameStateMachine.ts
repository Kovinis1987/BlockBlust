import {GameState} from "../types/GameState";
import GameStore from "./GameStore";

export default class GameStateMachine {
    constructor(private readonly gameStore: GameStore) {
    }

    public get current(): GameState {
        return this.gameStore.gameState;
    }

    public is(state: GameState): boolean {
        return this.current === state;
    }

    public isPlaying(): boolean {
        return this.is(GameState.PLAYING);
    }

    public isTeleportMode(): boolean {
        return this.is(GameState.BOOSTER_TELEPORT);
    }

    public isBombMode(): boolean {
        return this.is(GameState.BOOSTER_BOMB);
    }

    public enterPlaying(): void {
        this.gameStore.setGameState(GameState.PLAYING);
    }

    public enterTeleportMode(): void {
        this.gameStore.setGameState(GameState.BOOSTER_TELEPORT);
    }

    public enterBombMode(): void {
        this.gameStore.setGameState(GameState.BOOSTER_BOMB);
    }

    public enterWin(): void {
        this.gameStore.setGameState(GameState.WIN);
    }

    public enterLose(): void {
        this.gameStore.setGameState(GameState.LOST);
    }
}
