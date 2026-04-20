import EffectTypes from "../types/EffectTypes";
import GameBoardHelper from "../board/GameBoardHelper";
import GameSessionService from "../session/GameSessionService";
import GameStateMachine from "../session/GameStateMachine";
import {TurnResolutionContext} from "../flow/TurnResolutionService";
import {BoardRuntimePort} from "../flow/BoardRuntimePort";

export interface BombBoosterContext {
    resolutionContext: TurnResolutionContext;
    gameSessionService: GameSessionService;
    gameStateMachine: GameStateMachine;
    bombRadius: number;
    currentRows: number;
    currentCols: number;
    activateBooster: (r: number, c: number, type: number) => void;
    onFinished: () => void;
}

export default class BombBoosterService {
    public tryUse(centerRow: number, centerCol: number, context: BombBoosterContext): boolean {
        const board = context.resolutionContext.board;
        if (!board.hasTileAt(centerRow, centerCol) || GameBoardHelper.isObstacleType(context.resolutionContext.model.getTile(centerRow, centerCol))) {
            return false;
        }

        const affectedNodes = this.collectAffectedNodes(centerRow, centerCol, context);
        if (affectedNodes.length === 0) {
            return false;
        }

        context.resolutionContext.setProcessing(true);
        board.shakeCamera();

        const centerPos = board.getScreenPosition(centerRow, centerCol);
        board.spawnExplosionFx(centerPos, EffectTypes.BOMB);
        board.playSound("booster");

        for (const {r, c, type} of affectedNodes) {
            if (GameBoardHelper.isBoosterType(type)) {
                context.activateBooster(r, c, type);
            }
        }

        context.resolutionContext.model.clearCells(affectedNodes.map(node => ({r: node.r, c: node.c})));
        this.awardScore(
            affectedNodes,
            centerPos,
            context.resolutionContext.gameSessionService,
            board,
            context.resolutionContext.config.economy.scoreTile
        );

        let pendingAnimations = 0;
        let isFinished = false;
        for (const {type, r, c} of affectedNodes) {
            if (GameBoardHelper.isBoosterType(type)) {
                continue;
            }

            if (!board.destroyTileAt(r, c, () => {
                pendingAnimations--;
                if (pendingAnimations <= 0 && !isFinished) {
                    isFinished = true;
                    this.finishUse(context);
                }
            })) {
                continue;
            }

            pendingAnimations++;
        }

        if (pendingAnimations === 0 && !isFinished) {
            isFinished = true;
            this.finishUse(context);
        }

        return true;
    }

    private collectAffectedNodes(
        centerRow: number,
        centerCol: number,
        context: BombBoosterContext
    ): Array<{ r: number; c: number; type: number }> {
        const positions: Array<{ r: number; c: number; type: number }> = [];
        const board = context.resolutionContext.board;

        for (const {r, c} of GameBoardHelper.collectSquareCells(
            centerRow,
            centerCol,
            context.bombRadius,
            context.currentRows,
            context.currentCols
        )) {
            const type = context.resolutionContext.model.getTile(r, c);
            if (board.hasTileAt(r, c) && !GameBoardHelper.isObstacleType(type)) {
                positions.push({r, c, type});
            }
        }

        return positions;
    }

    private awardScore(
        nodes: Array<{ r: number; c: number; type: number }>,
        localPosition: cc.Vec2,
        gameSessionService: GameSessionService,
        board: BoardRuntimePort,
        scorePerTile: number
    ): void {
        const worldPos = board.toWorldPosition(localPosition);
        const normalTiles = nodes.filter(node => GameBoardHelper.isColorType(node.type));

        if (normalTiles.length <= 0) {
            return;
        }

        const points = normalTiles.length * scorePerTile;
        gameSessionService.addScore(points);
        board.showScore(worldPos, points);
    }

    private finishUse(context: BombBoosterContext): void {
        context.resolutionContext.setProcessing(false);
        context.gameStateMachine.enterPlaying();
        context.gameSessionService.useBombBooster();
        context.onFinished();
    }
}
