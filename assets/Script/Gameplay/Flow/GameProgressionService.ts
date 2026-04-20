import GridModel from "../board/GridModel";
import GameSessionService from "../session/GameSessionService";
import GameStateMachine from "../session/GameStateMachine";
import GameStore from "../session/GameStore";

export interface GameProgressionContext {
    model: GridModel;
    gameStore: GameStore;
    gameSessionService: GameSessionService;
    gameStateMachine: GameStateMachine;
    minMatch: number;
    continueMoves: number;
    setProcessing: (value: boolean) => void;
    shuffleGrid: () => void;
}

export default class GameProgressionService {
    public handleContinue(context: GameProgressionContext): void {
        context.gameSessionService.continueGame(context.continueMoves);

        if (!context.model.hasAvailableMoves(context.minMatch)) {
            context.shuffleGrid();
        }
    }

    public checkPossibleMoves(context: GameProgressionContext): boolean {
        if (context.gameSessionService.checkLoseCondition()) {
            return true;
        }

        if (context.gameStore.score >= context.gameStore.targetScore) {
            return true;
        }

        if (context.model.hasAvailableMoves(context.minMatch)) {
            return false;
        }

        if (context.gameSessionService.useShuffle()) {
            context.shuffleGrid();
            return true;
        }

        if (context.gameStore.score < context.gameStore.targetScore) {
            context.gameStateMachine.enterLose();
            return true;
        }

        return false;
    }

    public finalizePhysics(context: GameProgressionContext): void {
        context.setProcessing(false);

        if (context.gameSessionService.checkWinCondition()) {
            return;
        }

        if (context.gameSessionService.checkLoseCondition()) {
            return;
        }

        this.checkPossibleMoves(context);
    }
}
