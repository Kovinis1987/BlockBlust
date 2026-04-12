import {GameState} from "../../assets/Script/Gameplay/Types/GameState";
import GameSignals from "../../assets/Script/Gameplay/Session/GameSignals";
import GameStateMachine from "../../assets/Script/Gameplay/Session/GameStateMachine";
import GameStore from "../../assets/Script/Gameplay/Session/GameStore";

describe("GameStateMachine", () => {
    it("switches between supported states", () => {
        const gameStore = new GameStore(new GameSignals());
        const stateMachine = new GameStateMachine(gameStore);

        expect(stateMachine.isPlaying()).toBe(true);

        stateMachine.enterTeleportMode();
        expect(stateMachine.current).toBe(GameState.BOOSTER_TELEPORT);
        expect(stateMachine.isTeleportMode()).toBe(true);

        stateMachine.enterBombMode();
        expect(stateMachine.isBombMode()).toBe(true);

        stateMachine.enterWin();
        expect(stateMachine.current).toBe(GameState.WIN);

        stateMachine.enterLose();
        expect(stateMachine.current).toBe(GameState.LOST);
    });
});
