import TileComponent from "../Presentation/Components/TileComponent";
import GridModel from "../Gameplay/Board/GridModel";
import BoosterButtonTeleport from "../Presentation/Components/BoosterButtonTeleport";
import BoosterBombButton from "../Presentation/Components/BoosterBombButton";
import GameConfig from "../Config/GameConfig";
import {appContainer} from "../Core/DiContainer";
import {SERVICE_TOKENS} from "../Core/ServiceTokens";
import {registerDefaultServices} from "../Core/registerDefaultServices";
import AudioManager from "../Infrastructure/Audio/AudioManager";
import BoardInputService from "../Gameplay/Board/BoardInputService";
import BoardStateValidationService from "../Gameplay/Board/BoardStateValidationService";
import BoardViewService from "../Gameplay/Board/BoardViewService";
import BombBoosterService from "../Gameplay/Boosters/BombBoosterService";
import EffectManager from "../Infrastructure/Effects/EffectManager";
import GameBoardHelper from "../Gameplay/Board/GameBoardHelper";
import LevelFlowService from "../Gameplay/Flow/LevelFlowService";
import GameProgressionService from "../Gameplay/Flow/GameProgressionService";
import GameSessionService from "../Gameplay/Session/GameSessionService";
import GameSignals from "../Gameplay/Session/GameSignals";
import GameStateMachine from "../Gameplay/Session/GameStateMachine";
import GameStore from "../Gameplay/Session/GameStore";
import GridPhysicsService from "../Gameplay/Board/GridPhysicsService";
import LevelManager, {LoadedLevelData} from "../Gameplay/Session/LevelManager";
import PoolManager from "../Infrastructure/Pooling/PoolManager";
import TurnResolutionService from "../Gameplay/Flow/TurnResolutionService";

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

    private gameSignals: GameSignals;
    private gameStore: GameStore;
    private gameSessionService: GameSessionService;
    private gameProgressionService: GameProgressionService = new GameProgressionService();
    private levelFlowService: LevelFlowService = new LevelFlowService(this.gameProgressionService);
    private boardInputService: BoardInputService = new BoardInputService();
    private boardStateValidationService: BoardStateValidationService = new BoardStateValidationService();
    private boardViewService: BoardViewService = new BoardViewService();
    private gridPhysicsService: GridPhysicsService = new GridPhysicsService();
    private turnResolutionService: TurnResolutionService = new TurnResolutionService();
    private bombBoosterService: BombBoosterService = new BombBoosterService();
    private levelManager: LevelManager;
    private audioManager: AudioManager;
    private effectManager: EffectManager;
    private poolManager: PoolManager;
    private gameStateMachine: GameStateMachine;

    public onLoad() {
        registerDefaultServices();
        this.gameSignals = appContainer.resolve(SERVICE_TOKENS.gameSignals);
        this.gameStore = appContainer.resolve(SERVICE_TOKENS.gameStore);
        this.gameStateMachine = appContainer.resolve(SERVICE_TOKENS.gameStateMachine);
        this.gameSessionService = appContainer.resolve(SERVICE_TOKENS.gameSessionService);
        this.levelManager = appContainer.resolve(SERVICE_TOKENS.levelManager);
        this.audioManager = appContainer.resolve(SERVICE_TOKENS.audioManager);
        this.effectManager = appContainer.resolve(SERVICE_TOKENS.effectManager);
        this.poolManager = appContainer.resolve(SERVICE_TOKENS.poolManager);

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
        const boardState = this.boardViewService.buildBoard(
            levelData.rows,
            levelData.cols,
            levelData.tiles,
            {
                rowRockets: levelData.startRowRocketTiles,
                columnRockets: levelData.startColumnRocketTiles,
                bombs: levelData.startBombTiles,
                megas: levelData.startMegaTiles,
            },
            this.createBoardViewContext()
        );
        this.currentRows = boardState.rows;
        this.currentCols = boardState.cols;
        this.tileSizeX = boardState.tileSizeX;
        this.tileSizeY = boardState.tileSizeY;
        this.model = boardState.model;
    }

    private spawnBooster(r: number, c: number, type: number) {
        this.boardViewService.spawnBooster(this.model, r, c, type, this.createBoardViewContext());
    }

    private getScreenPosition(r: number, c: number): cc.Vec2 {
        return this.boardViewService.getScreenPosition(
            r,
            c,
            this.gridContainer,
            this.config,
            this.tileSizeX,
            this.tileSizeY
        );
    }

    private handleBombClick(centerR: number, centerC: number): boolean {
        return this.bombBoosterService.tryUse(centerR, centerC, {
            turnResolutionContext: this.createTurnResolutionContext(),
            gameSessionService: this.gameSessionService,
            gameStateMachine: this.gameStateMachine,
            bombRadius: this.config.boosters.bombRadius,
            currentRows: this.currentRows,
            currentCols: this.currentCols,
            getNodeAt: (r, c) => this.getNodeAt(r, c),
            getScreenPosition: (r, c) => this.getScreenPosition(r, c),
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
            gameStore: this.gameStore,
            gameSessionService: this.gameSessionService,
            gameStateMachine: this.gameStateMachine,
            audioManager: this.audioManager,
            isProcessing: this.isProcessing,
            setProcessing: (value) => {
                this.isProcessing = value;
            },
            getNodeAt: (row, col) => this.getNodeAt(row, col),
            activateBooster: (row, col, type) => this.activateBooster(row, col, type),
            tryBlast: (row, col) => this.tryBlast(row, col),
            handleBombAt: (row, col) => this.handleBombClick(row, col),
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
        this.gridContainer.children.forEach(node => {
            const comp = node.getComponent(TileComponent);
            if (!comp) return;
            const newType = this.model.getTile(comp.gridPos.y, comp.gridPos.x);
            comp.init(newType, comp.gridPos.y, comp.gridPos.x, (r, c) => this.onTileClick(r, c));
        });
    }

    private getNodesByCoords(coords: Array<{ r: number; c: number }>): cc.Node[] {
        return this.gridContainer.children.filter(node => {
            const comp = node.getComponent(TileComponent);
            if (!comp) return false;
            const cp = comp.gridPos;
            return coords.some(c => c.r === cp.y && c.c === cp.x);
        });
    }

    private getNodeAt(r: number, c: number): cc.Node {
        return this.gridContainer.children.find(node => {
            const comp = node.getComponent(TileComponent);
            if (!comp) return false;
            return comp.gridPos.y === r && comp.gridPos.x === c;
        });
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
            this.boardInputService.clearTeleportSelection();
        }
    }

    private onBombModeToggle(event: cc.Event.EventCustom) {
        const {active} = event.detail;

        if (active) {
            this.gameStateMachine.enterBombMode();
            this.boardInputService.clearTeleportSelection();
            this.audioManager.play("click");
        } else {
            this.gameStateMachine.enterPlaying();
        }
    }

    private createTurnResolutionContext() {
        return {
            model: this.model,
            config: this.config,
            gameStore: this.gameStore,
            gameSessionService: this.gameSessionService,
            audioManager: this.audioManager,
            effectManager: this.effectManager,
            poolManager: this.poolManager,
            gridPhysicsService: this.gridPhysicsService,
            gridContainer: this.gridContainer,
            currentRows: this.currentRows,
            currentCols: this.currentCols,
            tileSizeY: this.tileSizeY,
            isProcessing: this.isProcessing,
            setProcessing: (value: boolean) => {
                this.isProcessing = value;
            },
            getNodeAt: (r: number, c: number) => this.getNodeAt(r, c),
            getNodesByCoords: (coords: Array<{ r: number; c: number }>) => this.getNodesByCoords(coords),
            getScreenPosition: (r: number, c: number) => this.getScreenPosition(r, c),
            onTileClick: (r: number, c: number) => this.onTileClick(r, c),
            spawnBooster: (r: number, c: number, type: number) => this.spawnBooster(r, c, type),
            finalizePhysics: () => {
                if (!this.validateBoardState("finalize physics")) {
                    this.isProcessing = false;
                    return;
                }

                this.gameProgressionService.finalizePhysics(this.createGameProgressionContext());
            },
            scheduleOnce: (callback: () => void, delay: number) => this.scheduleOnce(callback, delay),
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
            clearBoard: () => {
                this.gridContainer.removeAllChildren();
            },
            setProcessing: (value: boolean) => {
                this.isProcessing = value;
            },
            setupLevel: (levelData: LoadedLevelData) => {
                this.setupGame(levelData);
            },
        };
    }

    private createBoardViewContext() {
        return {
            gridContainer: this.gridContainer,
            obstaclePrefab: this.obstaclePrefab,
            config: this.config,
            poolManager: this.poolManager,
            tileSizeX: this.tileSizeX,
            tileSizeY: this.tileSizeY,
            onTileClick: (r: number, c: number) => this.onTileClick(r, c),
            scheduleOnce: (callback: () => void, delay: number) => this.scheduleOnce(callback, delay),
            setProcessing: (value: boolean) => {
                this.isProcessing = value;
            },
        };
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
        this.gameSignals.off(GameSignals.EVT_CONTINUE, this.handleContinue, this);
        this.boosterButtonTeleport.node.off(GameSignals.EVT_BOOSTER_TELEPORT, this.onTeleportModeToggle, this);
        this.boosterButtonBomb.node.off(GameSignals.EVT_BOOSTER_BOMB, this.onBombModeToggle, this);
        this.gameSignals.off(GameSignals.EVT_RESTART, this.onRestart, this);
        this.gameSignals.off(GameSignals.EVT_NEXT_LEVEL, this.onNextLevel, this);
    }
}
