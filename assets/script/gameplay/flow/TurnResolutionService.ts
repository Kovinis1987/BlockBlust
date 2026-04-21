import GameConfig from "../../config/GameConfig";
import GridModel from "../board/GridModel";
import BoosterResolutionService, {BoosterPlan} from "../boosters/BoosterResolutionService";
import GameBoardHelper from "../board/GameBoardHelper";
import GameSessionService from "../session/GameSessionService";
import {TileType} from "../types/TileType";
import {BoardRuntimePort} from "./BoardRuntimePort";

export interface TurnResolutionContext {
    model: GridModel;
    config: GameConfig;
    gameSessionService: GameSessionService;
    board: BoardRuntimePort;
    currentRows: number;
    currentCols: number;
    isProcessing: boolean;
    setProcessing: (value: boolean) => void;
    finalizePhysics: () => void;
}

interface ExplosionExecutionState {
    activeExplosionsCount: number;
}

export default class TurnResolutionService {
    public tryBlast(r: number, c: number, context: TurnResolutionContext): void {
        if (context.isProcessing) return;

        const group = context.model.findGroup(r, c);
        if (group.length < 3) {
            context.board.shakeTile(r, c);
            return;
        }

        if (!context.board.hasTileAt(r, c) || context.board.countTilesAt(group) !== group.length) {
            cc.error(`[TurnResolutionService] Board desync detected before blast at (${r}, ${c}).`);
            return;
        }

        context.gameSessionService.useMove();

        this.awardScoreForNodes(
            group.map(coord => ({
                r: coord.r,
                c: coord.c,
                type: context.model.getTile(coord.r, coord.c),
            })),
            context.board.getScreenPosition(r, c),
            context
        );

        const boosterData = context.model.getBoosterType(group);
        context.model.clearCells(group);

        let count = 0;
        group.forEach(coord => {
            if (!context.board.destroyTileAt(coord.r, coord.c, () => {
                count++;
                if (count === group.length) {
                    if (boosterData) {
                        context.board.spawnBooster(r, c, boosterData.type);
                    }
                    this.processGridPhysics(context);
                }
            })) {
                return;
            }
        });
    }

    public activateBooster(r: number, c: number, type: number, context: TurnResolutionContext): void {
        this.activateBoosterInternal(r, c, type, context, {activeExplosionsCount: 0});
    }

    public processGridPhysics(context: TurnResolutionContext): void {
        context.board.processPhysics(context.finalizePhysics);
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
        const pos = context.board.getScreenPosition(r, c);

        if (plan.playCrossFx) {
            context.board.spawnCrossFx(pos);
        }

        if (plan.preExplosionFxType !== undefined) {
            context.board.spawnExplosionFx(pos, plan.preExplosionFxType);
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
        context.board.shakeCamera();

        if (epicenter) {
            BoosterResolutionService.sortCoordsByEpicenter(coords, epicenter);
            this.removeEpicenterNode(epicenter, fxType, context);
        }

        const renderableCoords = coords.filter(coord => context.board.hasTileAt(coord.r, coord.c));
        if (renderableCoords.length === 0) {
            this.finishExplosionWave(context, state);
            return;
        }

        renderableCoords.forEach((coord, index) => {
            const delay = index * context.config.animations.blastWaveDelay;
            context.board.schedule(() => {
                this.processSingleNodeExplosion(coord.r, coord.c, context, state, epicenter);
                if (index === renderableCoords.length - 1) {
                    this.finishExplosionWave(context, state);
                }
            }, delay);
        });
    }

    private awardScoreForNodes(
        nodes: Array<{ r: number; c: number; type: number }>,
        localPosition: cc.Vec2,
        context: TurnResolutionContext
    ): void {
        const normalTiles = nodes.filter(n => GameBoardHelper.isColorType(n.type));

        if (normalTiles.length > 0) {
            const points = normalTiles.length * context.config.economy.scoreTile;
            context.gameSessionService.addScore(points);
            context.board.showScore(context.board.toWorldPosition(localPosition), points);
        }
    }

    private removeEpicenterNode(epi: { r: number; c: number }, fxType: number, context: TurnResolutionContext): void {
        if (!context.board.hasTileAt(epi.r, epi.c)) return;

        const type = context.model.getTile(epi.r, epi.c);
        const pos = context.board.getScreenPosition(epi.r, epi.c);

        context.board.spawnExplosionFx(pos, fxType);
        context.model.clearCells([epi]);
        context.board.recycleBoosterAt(epi.r, epi.c, type);
    }

    private processSingleNodeExplosion(
        r: number,
        c: number,
        context: TurnResolutionContext,
        state: ExplosionExecutionState,
        epicenter?: { r: number; c: number }
    ): void {
        const type = context.model.getTile(r, c);
        if (type === TileType.EMPTY) return;

        const pos = context.board.getScreenPosition(r, c);

        const isNotEpicenter = !epicenter || (r !== epicenter.r || c !== epicenter.c);
        if (isNotEpicenter) {
            const fx = GameBoardHelper.getEffectTypeForTile(type);
            context.board.spawnExplosionFx(pos, fx);
        }

        if (GameBoardHelper.isBoosterType(type)) {
            this.handleBoosterChainReaction(r, c, type, context, state, epicenter);
        } else {
            this.handleRegularTileDestruction(r, c, context);
        }
    }

    private handleRegularTileDestruction(r: number, c: number, context: TurnResolutionContext): void {
        context.model.clearCells([{r, c}]);
        const localPos = context.board.getScreenPosition(r, c);
        const worldPos = context.board.toWorldPosition(localPos);
        const points = context.config.economy.scoreTile;
        context.gameSessionService.addScore(points);
        context.board.showScore(worldPos, points);

        context.board.destroyTileAt(r, c, () => undefined);
    }

    private handleBoosterChainReaction(
        r: number,
        c: number,
        type: number,
        context: TurnResolutionContext,
        state: ExplosionExecutionState,
        epicenter?: { r: number; c: number }
    ): void {
        const isNotEpicenter = !epicenter || (r !== epicenter.r || c !== epicenter.c);
        if (!isNotEpicenter) return;

        context.model.clearCells([{r, c}]);
        this.activateBoosterInternal(r, c, type, context, state);
        context.board.recycleBoosterAt(r, c, type);
    }

    private finishExplosionWave(context: TurnResolutionContext, state: ExplosionExecutionState): void {
        state.activeExplosionsCount--;
        if (state.activeExplosionsCount <= 0) {
            state.activeExplosionsCount = 0;
            this.processGridPhysics(context);
        }
    }
}
