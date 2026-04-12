import LevelManager, {LoadedLevelData} from "../Session/LevelManager";
import GameProgressionService, {GameProgressionContext} from "./GameProgressionService";
import GameSessionService from "../Session/GameSessionService";

export interface LevelFlowContext {
    levelManager: LevelManager;
    gameSessionService: GameSessionService;
    gameProgressionContext: GameProgressionContext;
    clearBoard: () => void;
    setProcessing: (value: boolean) => void;
    setupLevel: (levelData: LoadedLevelData) => void;
}

export default class LevelFlowService {
    constructor(private readonly gameProgressionService: GameProgressionService) {
    }

    public loadCurrentLevel(
        context: LevelFlowContext,
        resetLevelProgress: boolean,
        checkMovesAfterLoad: boolean,
        grantLevelBonuses: boolean
    ): void {
        this.runLevelLoad(
            (onComplete) => context.levelManager.loadCurrentLevel(onComplete),
            context,
            resetLevelProgress,
            checkMovesAfterLoad,
            grantLevelBonuses
        );
    }

    public reloadCurrentLevel(
        context: LevelFlowContext,
        resetLevelProgress: boolean,
        checkMovesAfterLoad: boolean,
        grantLevelBonuses: boolean
    ): void {
        this.runLevelLoad(
            (onComplete) => context.levelManager.reloadCurrentLevel(onComplete),
            context,
            resetLevelProgress,
            checkMovesAfterLoad,
            grantLevelBonuses
        );
    }

    private runLevelLoad(
        loader: (onComplete: (data: LoadedLevelData) => void) => void,
        context: LevelFlowContext,
        resetLevelProgress: boolean,
        checkMovesAfterLoad: boolean,
        grantLevelBonuses: boolean
    ): void {
        context.setProcessing(true);
        context.clearBoard();

        loader((levelData: LoadedLevelData) => {
            context.setupLevel(levelData);

            if (resetLevelProgress) {
                context.gameSessionService.resetLevel(
                    levelData.levelIndex,
                    levelData.moves,
                    levelData.targetScore
                );

                if (grantLevelBonuses) {
                    context.gameSessionService.grantLevelBonusBoosters(
                        levelData.bonusBombBoosters ?? 0,
                        levelData.bonusTeleportBoosters ?? 0
                    );
                }
            }

            context.setProcessing(false);
            if (checkMovesAfterLoad) {
                this.gameProgressionService.checkPossibleMoves(context.gameProgressionContext);
            }
        });
    }
}
