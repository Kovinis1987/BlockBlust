import AudioManager from "../infrastructure/audio/AudioManager";
import PoolManager from "../infrastructure/pooling/PoolManager";
import LevelManager from "../gameplay/session/LevelManager";
import GameSignals from "../gameplay/session/GameSignals";
import GameStore from "../gameplay/session/GameStore";
import GameStateMachine from "../gameplay/session/GameStateMachine";
import GameSessionService from "../gameplay/session/GameSessionService";
import EffectManager from "../infrastructure/effects/EffectManager";
import GameProgressionService from "../gameplay/flow/GameProgressionService";
import LevelFlowService from "../gameplay/flow/LevelFlowService";
import BoardInputService from "../gameplay/board/BoardInputService";
import BoardStateValidationService from "../gameplay/board/BoardStateValidationService";
import TurnResolutionService from "../gameplay/flow/TurnResolutionService";
import BombBoosterService from "../gameplay/boosters/BombBoosterService";

export interface RuntimeDependencies {
    audioManager: AudioManager;
    poolManager: PoolManager;
}

export interface GameRuntime {
    readonly gameSignals: GameSignals;
    readonly gameStore: GameStore;
    readonly gameStateMachine: GameStateMachine;
    readonly gameSessionService: GameSessionService;
    readonly levelManager: LevelManager;
    readonly effectManager: EffectManager;
    readonly gameProgressionService: GameProgressionService;
    readonly levelFlowService: LevelFlowService;
    readonly boardInputService: BoardInputService;
    readonly boardStateValidationService: BoardStateValidationService;
    readonly turnResolutionService: TurnResolutionService;
    readonly bombBoosterService: BombBoosterService;
}

export function createGameRuntime(dependencies: RuntimeDependencies): GameRuntime {
    const gameSignals = new GameSignals();
    const gameStore = new GameStore(gameSignals);
    const gameStateMachine = new GameStateMachine(gameStore);
    const gameSessionService = new GameSessionService(gameStore, gameSignals, gameStateMachine);
    const levelManager = new LevelManager(gameStore);
    const effectManager = new EffectManager(dependencies.poolManager, dependencies.audioManager);
    const gameProgressionService = new GameProgressionService();
    const levelFlowService = new LevelFlowService(gameProgressionService);

    return {
        gameSignals,
        gameStore,
        gameStateMachine,
        gameSessionService,
        levelManager,
        effectManager,
        gameProgressionService,
        levelFlowService,
        boardInputService: new BoardInputService(),
        boardStateValidationService: new BoardStateValidationService(),
        turnResolutionService: new TurnResolutionService(),
        bombBoosterService: new BombBoosterService(),
    };
}
