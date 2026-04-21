import GridModel from "./GridModel";
import AudioManager from "../../infrastructure/audio/AudioManager";
import GameSessionService from "../session/GameSessionService";
import GameStateMachine from "../session/GameStateMachine";
import GameBoardHelper from "./GameBoardHelper";

export interface GridCoord {
    r: number;
    c: number;
}

export interface BoardInputContext {
    model: GridModel;
    gameSessionService: GameSessionService;
    gameStateMachine: GameStateMachine;
    audioManager: AudioManager;
    isProcessing: boolean;
    setProcessing: (value: boolean) => void;
    activateBooster: (r: number, c: number, type: number) => void;
    tryBlast: (r: number, c: number) => void;
    handleBombAt: (r: number, c: number) => boolean;
    highlightTeleportSelection: (selection: GridCoord) => void;
    clearTeleportSelectionVisual: (selection: GridCoord) => void;
    swapTeleportTiles: (first: GridCoord, second: GridCoord, onComplete: () => void) => void;
    onTeleportCompleted: () => void;
}

export default class BoardInputService {
    private firstSelection: GridCoord | null = null;

    public handleTileClick(r: number, c: number, context: BoardInputContext): void {
        if (context.isProcessing) return;

        if (context.gameStateMachine.isBombMode()) {
            const didUseBomb = context.handleBombAt(r, c);
            if (didUseBomb) {
                context.gameSessionService.useMove();
            }
            return;
        }

        context.audioManager.play("click");

        if (context.gameStateMachine.isTeleportMode()) {
            this.handleTeleportClick(r, c, context);
            return;
        }

        if (!context.gameStateMachine.isPlaying()) {
            return;
        }

        const type = context.model.getTile(r, c);
        if (GameBoardHelper.isBoosterType(type)) {
            context.activateBooster(r, c, type);
            context.gameSessionService.useMove();
        } else {
            context.tryBlast(r, c);
        }
    }

    public clearTeleportSelection(clearVisual?: (selection: GridCoord) => void): void {
        if (this.firstSelection && clearVisual) {
            clearVisual(this.firstSelection);
        }

        this.firstSelection = null;
    }

    private handleTeleportClick(r: number, c: number, context: BoardInputContext): void {
        if (GameBoardHelper.isObstacleType(context.model.getTile(r, c))) return;

        if (this.firstSelection === null) {
            this.firstSelection = {r, c};
            context.highlightTeleportSelection(this.firstSelection);
            return;
        }

        if (this.firstSelection.r === r && this.firstSelection.c === c) {
            this.clearTeleportSelection(context.clearTeleportSelectionVisual);
            return;
        }

        this.performTeleportSwap({r, c}, context);
    }

    private performTeleportSwap(secondSelection: GridCoord, context: BoardInputContext): void {
        if (!this.firstSelection) return;

        const firstSelection = this.firstSelection;
        const firstTileType = context.model.getTile(firstSelection.r, firstSelection.c);
        const secondTileType = context.model.getTile(secondSelection.r, secondSelection.c);
        context.model.setTile(firstSelection.r, firstSelection.c, secondTileType);
        context.model.setTile(secondSelection.r, secondSelection.c, firstTileType);

        context.setProcessing(true);
        context.clearTeleportSelectionVisual(firstSelection);
        context.swapTeleportTiles(firstSelection, secondSelection, () => {
            context.audioManager.play("switch");
            context.onTeleportCompleted();
            this.firstSelection = null;
        });
    }
}
