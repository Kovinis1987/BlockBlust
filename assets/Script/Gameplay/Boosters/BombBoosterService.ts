import TileComponent from "../../Presentation/Components/TileComponent";
import EffectTypes from "../Types/EffectTypes";
import GameBoardHelper from "../Board/GameBoardHelper";
import GameSessionService from "../Session/GameSessionService";
import GameStateMachine from "../Session/GameStateMachine";
import {TurnResolutionContext} from "../Flow/TurnResolutionService";

export interface BombBoosterContext {
    turnResolutionContext: TurnResolutionContext;
    gameSessionService: GameSessionService;
    gameStateMachine: GameStateMachine;
    bombRadius: number;
    currentRows: number;
    currentCols: number;
    getNodeAt: (r: number, c: number) => cc.Node | null;
    getScreenPosition: (r: number, c: number) => cc.Vec2;
    activateBooster: (r: number, c: number, type: number) => void;
    onFinished: () => void;
}

export default class BombBoosterService {
    public tryUse(centerRow: number, centerCol: number, context: BombBoosterContext): boolean {
        const centerNode = context.getNodeAt(centerRow, centerCol);
        if (!centerNode || GameBoardHelper.isObstacleType(context.turnResolutionContext.model.getTile(centerRow, centerCol))) {
            return false;
        }

        const affectedNodes = this.collectAffectedNodes(centerRow, centerCol, context);
        if (affectedNodes.length === 0) {
            return false;
        }

        context.turnResolutionContext.setProcessing(true);
        context.turnResolutionContext.effectManager.shakeCamera();

        const centerPos = context.getScreenPosition(centerRow, centerCol);
        context.turnResolutionContext.effectManager.spawnExplosionFX(
            context.turnResolutionContext.gridContainer,
            centerPos,
            EffectTypes.BOMB
        );
        context.turnResolutionContext.audioManager.play("booster");

        for (const {r, c, type} of affectedNodes) {
            if (GameBoardHelper.isBoosterType(type)) {
                context.activateBooster(r, c, type);
            }
        }

        context.turnResolutionContext.model.clearCells(affectedNodes.map(node => ({r: node.r, c: node.c})));
        this.awardScore(affectedNodes, centerPos, context.turnResolutionContext.gameSessionService, context.turnResolutionContext);

        let pendingAnimations = 0;
        let isFinished = false;
        for (const {type, node} of affectedNodes) {
            if (GameBoardHelper.isBoosterType(type)) {
                continue;
            }

            pendingAnimations++;
            node.getComponent(TileComponent).destroyTile(() => {
                context.turnResolutionContext.poolManager.putTile(node);
                pendingAnimations--;
                if (pendingAnimations <= 0 && !isFinished) {
                    isFinished = true;
                    this.finishUse(context);
                }
            });
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
    ): Array<{ r: number; c: number; node: cc.Node; type: number }> {
        const positions: Array<{ r: number; c: number; node: cc.Node; type: number }> = [];

        for (const {r, c} of GameBoardHelper.collectSquareCells(
            centerRow,
            centerCol,
            context.bombRadius,
            context.currentRows,
            context.currentCols
        )) {
            const tileNode = context.getNodeAt(r, c);
            const type = context.turnResolutionContext.model.getTile(r, c);
            if (tileNode && !GameBoardHelper.isObstacleType(type)) {
                positions.push({r, c, node: tileNode, type});
            }
        }

        return positions;
    }

    private awardScore(
        nodes: Array<{ node: cc.Node; r: number; c: number }>,
        localPosition: cc.Vec2,
        gameSessionService: GameSessionService,
        turnResolutionContext: TurnResolutionContext
    ): void {
        const worldPos = turnResolutionContext.gridContainer.convertToWorldSpaceAR(localPosition);
        const normalTiles = nodes.filter(node => {
            const type = node.node.getComponent(TileComponent).type;
            return GameBoardHelper.isColorType(type);
        });

        if (normalTiles.length <= 0) {
            return;
        }

        const points = normalTiles.length * turnResolutionContext.config.economy.scoreTile;
        gameSessionService.addScore(points);
        turnResolutionContext.effectManager.showScoreAnimation(worldPos, points);
    }

    private finishUse(context: BombBoosterContext): void {
        context.turnResolutionContext.setProcessing(false);
        context.gameStateMachine.enterPlaying();
        context.gameSessionService.useBombBooster();
        context.onFinished();
    }
}
