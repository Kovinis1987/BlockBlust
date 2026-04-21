import GridModel from "../gameplay/board/GridModel";
import BoosterButtonTeleport from "../presentation/components/BoosterButtonTeleport";
import BoosterBombButton from "../presentation/components/BoosterBombButton";
import GameConfig from "../config/GameConfig";
import {createGameRuntime, GameRuntime} from "../core/GameRuntime";
import AudioManager from "../infrastructure/audio/AudioManager";
import BoardInputService from "../gameplay/board/BoardInputService";
import BoardStateValidationService from "../gameplay/board/BoardStateValidationService";
import BoardViewService from "../gameplay/board/BoardViewService";
import BombBoosterService from "../gameplay/boosters/BombBoosterService";
import EffectManager from "../infrastructure/effects/EffectManager";
import LevelFlowService from "../gameplay/flow/LevelFlowService";
import GameProgressionService from "../gameplay/flow/GameProgressionService";
import GameSessionService from "../gameplay/session/GameSessionService";
import GameSignals from "../gameplay/session/GameSignals";
import GameStateMachine from "../gameplay/session/GameStateMachine";
import GameStore from "../gameplay/session/GameStore";
import GridPhysicsService from "../gameplay/board/GridPhysicsService";
import LevelManager, {LoadedLevelData} from "../gameplay/session/LevelManager";
import PoolManager from "../infrastructure/pooling/PoolManager";
import TurnResolutionService from "../gameplay/flow/TurnResolutionService";
import {BoardRuntimePort} from "../gameplay/flow/BoardRuntimePort";
import BoardSceneService from "../presentation/Board/BoardSceneService";
import ScoreUIController from "../presentation/ui/ScoreUIController";
import GameOverWindow from "../presentation/ui/GameOverWindow";
import WinWindow from "../presentation/ui/WinWindow";

const {ccclass, property} = cc._decorator;

@ccclass
export default class GameController extends cc.Component {
    @property(cc.Node)
    gridContainer: cc.Node = null;

    @property(BoosterButtonTeleport)
    boosterButtonTeleport: BoosterButtonTeleport = null;

    @property(BoosterBombButton)
    boosterButtonBomb: BoosterBombButton = null;

    @property(cc.Prefab)
    obstaclePrefab: cc.Prefab = null;

    @property(GameConfig)
    config: GameConfig = null;

    private model: GridModel = null;
    private isProcessing = false;
    private tileSizeX = 100;
    private tileSizeY = 112;
    private currentRows = 8;
    private currentCols = 8;

    private runtime: GameRuntime;
    private boardSceneService: BoardSceneService;
    private gameSignals: GameSignals;
    private gameStore: GameStore;
    private gameSessionService: GameSessionService;
    private gameProgressionService: GameProgressionService;
    private levelFlowService: LevelFlowService;
    private boardInputService: BoardInputService;
    private boardStateValidationService: BoardStateValidationService;
    private gridPhysicsService: GridPhysicsService;
    private turnResolutionService: TurnResolutionService;
    private bombBoosterService: BombBoosterService;
    private levelManager: LevelManager;
    private audioManager: AudioManager;
    private effectManager: EffectManager;
    private poolManager: PoolManager;
    private gameStateMachine: GameStateMachine;

    public onLoad() {
        this.audioManager = this.requireSceneComponent(AudioManager);
        this.poolManager = this.requireSceneComponent(PoolManager);
        this.gridPhysicsService = new GridPhysicsService();

        this.runtime = createGameRuntime({
            audioManager: this.audioManager,
            poolManager: this.poolManager,
        });
        this.boardSceneService = new BoardSceneService(
            this.gridContainer,
            this.obstaclePrefab,
            this.config,
            this.poolManager,
            new BoardViewService(),
            this.gridPhysicsService
        );

        this.gameSignals = this.runtime.gameSignals;
        this.gameStore = this.runtime.gameStore;
        this.gameStateMachine = this.runtime.gameStateMachine;
        this.gameSessionService = this.runtime.gameSessionService;
        this.levelManager = this.runtime.levelManager;
        this.effectManager = this.runtime.effectManager;
        this.gameProgressionService = this.runtime.gameProgressionService;
        this.levelFlowService = this.runtime.levelFlowService;
        this.boardInputService = this.runtime.boardInputService;
        this.boardStateValidationService = this.runtime.boardStateValidationService;
        this.turnResolutionService = this.runtime.turnResolutionService;
        this.bombBoosterService = this.runtime.bombBoosterService;

        this.initializePresentation();

        this.gameSignals.on(GameSignals.EVT_CONTINUE, this.handleContinue, this);
        this.boosterButtonTeleport.node.on(GameSignals.EVT_BOOSTER_TELEPORT, this.onTeleportModeToggle, this);
        this.boosterButtonBomb.node.on(GameSignals.EVT_BOOSTER_BOMB, this.onBombModeToggle, this);
        this.gameSignals.on(GameSignals.EVT_RESTART, this.onRestart, this);
        this.gameSignals.on(GameSignals.EVT_NEXT_LEVEL, this.onNextLevel, this);

        this.loadCurrentLevel();
    }

    private loadCurrentLevel() {
        this.levelFlowService.loadCurrentLevel(this.createLevelFlowContext(), true, false, true);
    }

    private loadCurrentLevelFlow(resetLevelProgress: boolean, checkMovesAfterLoad: boolean, grantLevelBonuses: boolean) {
        this.levelFlowService.loadCurrentLevel(
            this.createLevelFlowContext(),
            resetLevelProgress,
            checkMovesAfterLoad,
            grantLevelBonuses
        );
    }

    private reloadCurrentLevelFlow(resetLevelProgress: boolean, checkMovesAfterLoad: boolean, grantLevelBonuses: boolean) {
        this.levelFlowService.reloadCurrentLevel(
            this.createLevelFlowContext(),
            resetLevelProgress,
            checkMovesAfterLoad,
            grantLevelBonuses
        );
    }

    private setupGame(levelData: LoadedLevelData) {
        const boardState = this.boardSceneService.buildBoard(
            levelData.rows,
            levelData.cols,
            levelData.tiles,
            {
                rowRockets: levelData.startRowRocketTiles,
                columnRockets: levelData.startColumnRocketTiles,
                bombs: levelData.startBombTiles,
                megas: levelData.startMegaTiles,
            },
            this.tileSizeX,
            this.tileSizeY,
            (r, c) => this.onTileClick(r, c),
            (callback, delay) => this.scheduleOnce(callback, delay),
            (value) => {
                this.isProcessing = value;
            }
        );
        this.currentRows = boardState.rows;
        this.currentCols = boardState.cols;
        this.tileSizeX = boardState.tileSizeX;
        this.tileSizeY = boardState.tileSizeY;
        this.model = boardState.model;
    }

    private spawnBooster(r: number, c: number, type: number) {
        this.boardSceneService.spawnBooster(
            this.model,
            r,
            c,
            type,
            this.tileSizeX,
            this.tileSizeY,
            (row, col) => this.onTileClick(row, col),
            (callback, delay) => this.scheduleOnce(callback, delay),
            (value) => {
                this.isProcessing = value;
            }
        );
    }

    private getScreenPosition(r: number, c: number): cc.Vec2 {
        return this.boardSceneService.getScreenPosition(r, c, this.tileSizeX, this.tileSizeY);
    }

    private handleBombClick(centerR: number, centerC: number): boolean {
        return this.bombBoosterService.tryUse(centerR, centerC, {
            resolutionContext: this.createTurnResolutionContext(),
            gameSessionService: this.gameSessionService,
            gameStateMachine: this.gameStateMachine,
            bombRadius: this.config.boosters.bombRadius,
            currentRows: this.currentRows,
            currentCols: this.currentCols,
            activateBooster: (r, c, type) => this.activateBooster(r, c, type),
            onFinished: () => {
                this.turnResolutionService.processGridPhysics(this.createTurnResolutionContext());
            },
        });
    }

    private finishTeleport() {
        this.isProcessing = false;
        this.gameStateMachine.enterPlaying();
        this.gameSessionService.useTeleportBooster();
        this.gameProgressionService.checkPossibleMoves(this.createGameProgressionContext());
    }

    private tryBlast(r: number, c: number) {
        this.turnResolutionService.tryBlast(r, c, this.createTurnResolutionContext());
    }

    private onTileClick(r: number, c: number) {
        if (!this.validateBoardState("tile click")) {
            return;
        }

        this.boardInputService.handleTileClick(r, c, {
            model: this.model,
            gameSessionService: this.gameSessionService,
            gameStateMachine: this.gameStateMachine,
            audioManager: this.audioManager,
            isProcessing: this.isProcessing,
            setProcessing: (value) => {
                this.isProcessing = value;
            },
            activateBooster: (row, col, type) => this.activateBooster(row, col, type),
            tryBlast: (row, col) => this.tryBlast(row, col),
            handleBombAt: (row, col) => this.handleBombClick(row, col),
            highlightTeleportSelection: (selection) => this.boardSceneService.emphasizeTeleportSelection(selection.r, selection.c),
            clearTeleportSelectionVisual: (selection) => this.boardSceneService.resetTeleportSelection(selection.r, selection.c),
            swapTeleportTiles: (first, second, onComplete) => this.boardSceneService.swapTiles(first, second, onComplete),
            onTeleportCompleted: () => this.finishTeleport(),
        });
    }

    private handleContinue() {
        this.gameProgressionService.handleContinue(this.createGameProgressionContext());
    }

    private onRestart() {
        this.reloadCurrentLevelFlow(true, false, false);
    }

    private onNextLevel() {
        this.loadCurrentLevelFlow(true, true, true);
    }

    private shuffleGrid() {
        this.model.shuffleOnlyColors();
        this.boardSceneService.shuffleView(this.model, (r, c) => this.onTileClick(r, c));
    }

    private getNodeAt(r: number, c: number): cc.Node | null {
        return this.boardSceneService.getNodeAt(r, c);
    }

    private activateBooster(r: number, c: number, type: number) {
        this.turnResolutionService.activateBooster(r, c, type, this.createTurnResolutionContext());
    }

    private onTeleportModeToggle(event: cc.Event.EventCustom) {
        const {active} = event.detail;
        if (active) {
            this.gameStateMachine.enterTeleportMode();
            this.audioManager.play("click");
        } else {
            this.gameStateMachine.enterPlaying();
            this.boardInputService.clearTeleportSelection((selection) => {
                this.boardSceneService.resetTeleportSelection(selection.r, selection.c);
            });
        }
    }

    private onBombModeToggle(event: cc.Event.EventCustom) {
        const {active} = event.detail;

        if (active) {
            this.gameStateMachine.enterBombMode();
            this.boardInputService.clearTeleportSelection((selection) => {
                this.boardSceneService.resetTeleportSelection(selection.r, selection.c);
            });
            this.audioManager.play("click");
        } else {
            this.gameStateMachine.enterPlaying();
        }
    }

    private createTurnResolutionContext() {
        return {
            model: this.model,
            config: this.config,
            gameSessionService: this.gameSessionService,
            board: this.createBoardRuntimePort(),
            currentRows: this.currentRows,
            currentCols: this.currentCols,
            isProcessing: this.isProcessing,
            setProcessing: (value: boolean) => {
                this.isProcessing = value;
            },
            finalizePhysics: () => {
                if (!this.validateBoardState("finalize physics")) {
                    this.isProcessing = false;
                    return;
                }

                this.gameProgressionService.finalizePhysics(this.createGameProgressionContext());
            },
        };
    }

    private createBoardRuntimePort(): BoardRuntimePort {
        return {
            hasTileAt: (r, c) => this.boardSceneService.hasTileAt(r, c),
            countTilesAt: (coords) => this.boardSceneService.countNodesAt(coords),
            shakeTile: (r, c) => this.boardSceneService.shakeTile(r, c),
            destroyTileAt: (r, c, onComplete) => this.boardSceneService.destroyTileAt(r, c, onComplete),
            recycleBoosterAt: (r, c, type) => this.boardSceneService.recycleBoosterAt(r, c, type),
            spawnBooster: (r, c, type) => this.spawnBooster(r, c, type),
            getScreenPosition: (r, c) => this.getScreenPosition(r, c),
            toWorldPosition: (localPosition) => this.gridContainer.convertToWorldSpaceAR(localPosition),
            spawnCrossFx: (position) => this.effectManager.spawnCrossFX(this.gridContainer, position),
            spawnExplosionFx: (position, fxType) => this.effectManager.spawnExplosionFX(this.gridContainer, position, fxType),
            showScore: (position, points) => this.effectManager.showScoreAnimation(position, points),
            shakeCamera: () => this.effectManager.shakeCamera(),
            playSound: (name) => this.audioManager.play(name),
            schedule: (callback, delay) => this.scheduleOnce(callback, delay),
            processPhysics: (onComplete) => this.gridPhysicsService.process({
                model: this.model,
                gridContainer: this.gridContainer,
                currentRows: this.currentRows,
                tileSizeY: this.tileSizeY,
                poolManager: this.poolManager,
                getNodeAt: (r, c) => this.getNodeAt(r, c),
                getScreenPosition: (r, c) => this.getScreenPosition(r, c),
                onTileClick: (r, c) => this.onTileClick(r, c),
                onComplete,
            }),
        };
    }

    private createGameProgressionContext() {
        return {
            model: this.model,
            gameStore: this.gameStore,
            gameSessionService: this.gameSessionService,
            gameStateMachine: this.gameStateMachine,
            minMatch: this.config.economy.minMatch,
            continueMoves: this.config.economy.continueMoves,
            setProcessing: (value: boolean) => {
                this.isProcessing = value;
            },
            shuffleGrid: () => this.shuffleGrid(),
        };
    }

    private createLevelFlowContext() {
        return {
            levelManager: this.levelManager,
            gameSessionService: this.gameSessionService,
            gameProgressionContext: this.createGameProgressionContext(),
            clearBoard: () => this.boardSceneService.clearBoard(),
            setProcessing: (value: boolean) => {
                this.isProcessing = value;
            },
            setupLevel: (levelData: LoadedLevelData) => {
                this.setupGame(levelData);
            },
        };
    }

    private initializePresentation(): void {
        this.boosterButtonTeleport.initialize({
            gameSignals: this.gameSignals,
            gameStore: this.gameStore,
            audioManager: this.audioManager,
        });
        this.boosterButtonBomb.initialize({
            gameSignals: this.gameSignals,
            gameStore: this.gameStore,
            audioManager: this.audioManager,
        });

        const scoreUi = this.findSceneComponent(ScoreUIController);
        scoreUi?.initialize({
            gameSignals: this.gameSignals,
            gameStore: this.gameStore,
        });

        const gameOverWindow = this.findSceneComponent(GameOverWindow);
        gameOverWindow?.initialize({
            gameSignals: this.gameSignals,
            gameStore: this.gameStore,
            gameSessionService: this.gameSessionService,
            audioManager: this.audioManager,
        });

        const winWindow = this.findSceneComponent(WinWindow);
        winWindow?.initialize({
            gameSignals: this.gameSignals,
            gameStore: this.gameStore,
            gameSessionService: this.gameSessionService,
            audioManager: this.audioManager,
        });
    }

    private findSceneComponent<T extends cc.Component>(type: { new(): T }): T | null {
        const scene = cc.director.getScene();
        if (!scene) {
            return null;
        }

        return scene.getComponentInChildren(type);
    }

    private requireSceneComponent<T extends cc.Component>(type: { new(): T }): T {
        const component = this.findSceneComponent(type);
        if (!component) {
            throw new Error(`Required scene component not found: ${type.name}`);
        }

        return component;
    }

    private validateBoardState(source: string): boolean {
        if (!this.model) {
            return true;
        }

        const isValid = this.boardStateValidationService.validate({
            model: this.model,
            gridContainer: this.gridContainer,
            rows: this.currentRows,
            cols: this.currentCols,
        });

        if (!isValid) {
            cc.error(`[GameController] Board state validation failed during ${source}.`);
        }

        return isValid;
    }

    public onDestroy() {
        if (!this.gameSignals) {
            return;
        }

        this.gameSignals.off(GameSignals.EVT_CONTINUE, this.handleContinue, this);
        this.boosterButtonTeleport.node.off(GameSignals.EVT_BOOSTER_TELEPORT, this.onTeleportModeToggle, this);
        this.boosterButtonBomb.node.off(GameSignals.EVT_BOOSTER_BOMB, this.onBombModeToggle, this);
        this.gameSignals.off(GameSignals.EVT_RESTART, this.onRestart, this);
        this.gameSignals.off(GameSignals.EVT_NEXT_LEVEL, this.onNextLevel, this);
    }
}
