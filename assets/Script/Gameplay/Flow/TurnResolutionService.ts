import GameConfig from "../../Config/GameConfig";
import GridModel from "../Board/GridModel";
import TileComponent from "../../Presentation/Components/TileComponent";
import AudioManager from "../../Infrastructure/Audio/AudioManager";
import BoosterResolutionService, {BoosterPlan} from "../Boosters/BoosterResolutionService";
import EffectManager from "../../Infrastructure/Effects/EffectManager";
import GameBoardHelper from "../Board/GameBoardHelper";
import GridPhysicsService from "../Board/GridPhysicsService";
import GameSessionService from "../Session/GameSessionService";
import GameStore from "../Session/GameStore";
import PoolManager from "../../Infrastructure/Pooling/PoolManager";

export interface TurnResolutionContext {
    model: GridModel;
    config: GameConfig;
    gameStore: GameStore;
    gameSessionService: GameSessionService;
    audioManager: AudioManager;
    effectManager: EffectManager;
    poolManager: PoolManager;
    gridPhysicsService: GridPhysicsService;
    gridContainer: cc.Node;
    currentRows: number;
    currentCols: number;
    tileSizeY: number;
    isProcessing: boolean;
    setProcessing: (value: boolean) => void;
    getNodeAt: (r: number, c: number) => cc.Node | null;
    getNodesByCoords: (coords: Array<{ r: number; c: number }>) => cc.Node[];
    getScreenPosition: (r: number, c: number) => cc.Vec2;
    onTileClick: (r: number, c: number) => void;
    spawnBooster: (r: number, c: number, type: number) => void;
    finalizePhysics: () => void;
    scheduleOnce: (callback: () => void, delay: number) => void;
}

interface ExplosionExecutionState {
    activeExplosionsCount: number;
}

export default class TurnResolutionService {
    public tryBlast(r: number, c: number, context: TurnResolutionContext): void {
        if (context.isProcessing) return;

        const group = context.model.findGroup(r, c);
        if (group.length < 3) {
            const node = context.getNodeAt(r, c);
            if (node) {
                node.getComponent(TileComponent).shake();
            }
            return;
        }

        const nodesToDestroy = context.getNodesByCoords(group);
        const tileNode = context.getNodeAt(r, c);
        if (!tileNode || nodesToDestroy.length !== group.length) {
            cc.error(`[TurnResolutionService] Board desync detected before blast at (${r}, ${c}).`);
            return;
        }

        context.gameSessionService.useMove();

        this.awardScoreForNodes(
            nodesToDestroy.map(node => {
                const comp = node.getComponent(TileComponent);
                return {node, r: comp.gridPos.y, c: comp.gridPos.x};
            }),
            tileNode.getPosition(),
            context
        );

        const boosterData = context.model.getBoosterType(group);
        context.model.clearCells(group);

        let count = 0;
        nodesToDestroy.forEach(node => {
            node.getComponent(TileComponent).destroyTile(() => {
                context.poolManager.putTile(node);
                count++;
                if (count === nodesToDestroy.length) {
                    if (boosterData) {
                        context.spawnBooster(r, c, boosterData.type);
                    }
                    this.processGridPhysics(context);
                }
            });
        });
    }

    public activateBooster(r: number, c: number, type: number, context: TurnResolutionContext): void {
        this.activateBoosterInternal(r, c, type, context, {activeExplosionsCount: 0});
    }

    public processGridPhysics(context: TurnResolutionContext): void {
        context.gridPhysicsService.process({
            model: context.model,
            gridContainer: context.gridContainer,
            currentRows: context.currentRows,
            tileSizeY: context.tileSizeY,
            poolManager: context.poolManager,
            getNodeAt: context.getNodeAt,
            getScreenPosition: context.getScreenPosition,
            onTileClick: context.onTileClick,
            onComplete: context.finalizePhysics,
        });
    }

    private activateBoosterInternal(
        r: number,
        c: number,
        type: number,
        context: TurnResolutionContext,
        state: ExplosionExecutionState
    ): void {
        const neighborBooster = BoosterResolutionService.findNeighborBooster(
            r,
            c,
            context.currentRows,
            context.currentCols,
            (row, col) => context.model.getTile(row, col)
        );

        const plan = neighborBooster
            ? BoosterResolutionService.buildComboPlan(
                r, c, type, neighborBooster.type, context.currentRows, context.currentCols, context.config.boosters.bombRadius
            )
            : BoosterResolutionService.buildSinglePlan(
                r, c, type, context.currentRows, context.currentCols, context.config.boosters.bombRadius
            );

        this.executeBoosterPlan(r, c, plan, context, state);
    }

    private executeBoosterPlan(
        r: number,
        c: number,
        plan: BoosterPlan,
        context: TurnResolutionContext,
        state: ExplosionExecutionState
    ): void {
        context.setProcessing(true);
        const pos = context.getScreenPosition(r, c);

        if (plan.playCrossFx) {
            context.effectManager.spawnCrossFX(context.gridContainer, pos);
        }

        if (plan.preExplosionFxType !== undefined) {
            context.effectManager.spawnExplosionFX(context.gridContainer, pos, plan.preExplosionFxType);
        }

        this.executeExplosion(plan.affected, context, state, {r, c}, plan.fxType);
    }

    private executeExplosion(
        coords: Array<{ r: number; c: number }>,
        context: TurnResolutionContext,
        state: ExplosionExecutionState,
        epicenter?: { r: number; c: number },
        fxType: number = 0
    ): void {
        state.activeExplosionsCount++;
        context.effectManager.shakeCamera();

        if (epicenter) {
            BoosterResolutionService.sortCoordsByEpicenter(coords, epicenter);
            this.removeEpicenterNode(epicenter, fxType, context);
        }

        const nodesToDestroy = context.getNodesByCoords(coords);
        if (nodesToDestroy.length === 0) {
            this.finishExplosionWave(context, state);
            return;
        }

        nodesToDestroy.forEach((node, index) => {
            const delay = index * context.config.animations.blastWaveDelay;
            context.scheduleOnce(() => {
                this.processSingleNodeExplosion(node, context, state, epicenter);
                if (index === nodesToDestroy.length - 1) {
                    this.finishExplosionWave(context, state);
                }
            }, delay);
        });
    }

    private awardScoreForNodes(
        nodes: Array<{ node: cc.Node; r: number; c: number }>,
        pos: cc.Vec2,
        context: TurnResolutionContext
    ): void {
        const worldPos = context.gridContainer.convertToWorldSpaceAR(pos);
        const normalTiles = nodes.filter(n => {
            const type = n.node.getComponent(TileComponent).type;
            return GameBoardHelper.isColorType(type);
        });

        if (normalTiles.length > 0) {
            const points = normalTiles.length * context.config.economy.scoreTile;
            context.gameSessionService.addScore(points);
            context.effectManager.showScoreAnimation(worldPos, points);
        }
    }

    private removeEpicenterNode(epi: { r: number; c: number }, fxType: number, context: TurnResolutionContext): void {
        const epiNode = context.getNodeAt(epi.r, epi.c);
        if (!epiNode) return;

        const type = epiNode.getComponent(TileComponent).type;
        const pos = context.getScreenPosition(epi.r, epi.c);

        context.effectManager.spawnExplosionFX(context.gridContainer, pos, fxType);
        context.model.clearCells([epi]);
        context.poolManager.putBooster(epiNode, type);
    }

    private processSingleNodeExplosion(
        node: cc.Node,
        context: TurnResolutionContext,
        state: ExplosionExecutionState,
        epicenter?: { r: number; c: number }
    ): void {
        if (!cc.isValid(node)) return;

        const comp = node.getComponent(TileComponent);
        const {y: r, x: c} = comp.gridPos;
        const type = comp.type;
        const pos = context.getScreenPosition(r, c);

        const isNotEpicenter = !epicenter || (r !== epicenter.r || c !== epicenter.c);
        if (isNotEpicenter) {
            const fx = GameBoardHelper.getEffectTypeForTile(type);
            context.effectManager.spawnExplosionFX(context.gridContainer, pos, fx);
        }

        if (GameBoardHelper.isBoosterType(type)) {
            this.handleBoosterChainReaction(r, c, type, node, context, state, epicenter);
        } else {
            this.handleRegularTileDestruction(node, r, c, context);
        }
    }

    private handleRegularTileDestruction(node: cc.Node, r: number, c: number, context: TurnResolutionContext): void {
        if (!cc.isValid(node) || !node.parent) return;

        context.model.clearCells([{r, c}]);
        const localPos = context.getScreenPosition(r, c);
        const worldPos = context.gridContainer.convertToWorldSpaceAR(localPos);
        const points = context.config.economy.scoreTile;
        context.gameSessionService.addScore(points);
        context.effectManager.showScoreAnimation(worldPos, points);

        node.getComponent(TileComponent).destroyTile(() => {
            context.poolManager.putTile(node);
        });
    }

    private handleBoosterChainReaction(
        r: number,
        c: number,
        type: number,
        node: cc.Node,
        context: TurnResolutionContext,
        state: ExplosionExecutionState,
        epicenter?: { r: number; c: number }
    ): void {
        const isNotEpicenter = !epicenter || (r !== epicenter.r || c !== epicenter.c);
        if (!isNotEpicenter) return;

        context.model.clearCells([{r, c}]);
        this.activateBoosterInternal(r, c, type, context, state);
        context.poolManager.putBooster(node, type);
    }

    private finishExplosionWave(context: TurnResolutionContext, state: ExplosionExecutionState): void {
        state.activeExplosionsCount--;
        if (state.activeExplosionsCount <= 0) {
            state.activeExplosionsCount = 0;
            this.processGridPhysics(context);
        }
    }
}
