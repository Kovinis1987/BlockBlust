import {appContainer} from "./DiContainer";
import {SERVICE_TOKENS} from "./ServiceTokens";
import LevelManager from "../Gameplay/Session/LevelManager";
import EffectManager from "../Infrastructure/Effects/EffectManager";
import AudioManager from "../Infrastructure/Audio/AudioManager";
import PoolManager from "../Infrastructure/Pooling/PoolManager";
import GameSignals from "../Gameplay/Session/GameSignals";
import GameSessionService from "../Gameplay/Session/GameSessionService";
import GameStateMachine from "../Gameplay/Session/GameStateMachine";
import GameStore from "../Gameplay/Session/GameStore";

function findInScene<T extends cc.Component>(type: {new(): T}): T | null {
    const scene = cc.director.getScene();
    if (!scene) return null;
    return scene.getComponentInChildren(type);
}

export function registerDefaultServices() {
    let audioManager: AudioManager | null = null;
    let poolManager: PoolManager | null = null;

    if (!appContainer.isRegistered(SERVICE_TOKENS.gameSignals)) {
        appContainer.registerInstance(SERVICE_TOKENS.gameSignals, new GameSignals());
    }

    if (!appContainer.isRegistered(SERVICE_TOKENS.gameStore)) {
        const gameSignals = appContainer.resolve(SERVICE_TOKENS.gameSignals);
        appContainer.registerInstance(SERVICE_TOKENS.gameStore, new GameStore(gameSignals));
    }

    if (!appContainer.isRegistered(SERVICE_TOKENS.gameStateMachine)) {
        const gameStore = appContainer.resolve(SERVICE_TOKENS.gameStore);
        appContainer.registerInstance(SERVICE_TOKENS.gameStateMachine, new GameStateMachine(gameStore));
    }

    if (!appContainer.isRegistered(SERVICE_TOKENS.gameSessionService)) {
        const gameStore = appContainer.resolve(SERVICE_TOKENS.gameStore);
        const gameSignals = appContainer.resolve(SERVICE_TOKENS.gameSignals);
        const gameStateMachine = appContainer.resolve(SERVICE_TOKENS.gameStateMachine);
        appContainer.registerInstance(
            SERVICE_TOKENS.gameSessionService,
            new GameSessionService(gameStore, gameSignals, gameStateMachine)
        );
    }

    if (!appContainer.isRegistered(SERVICE_TOKENS.levelManager)) {
        const gameStore = appContainer.resolve(SERVICE_TOKENS.gameStore);
        appContainer.registerInstance(SERVICE_TOKENS.levelManager, new LevelManager(gameStore));
    }

    if (!appContainer.isRegistered(SERVICE_TOKENS.audioManager)) {
        audioManager = findInScene(AudioManager);
        if (audioManager) {
            appContainer.registerInstance(SERVICE_TOKENS.audioManager, audioManager);
        }
    } else {
        audioManager = appContainer.resolve(SERVICE_TOKENS.audioManager);
    }

    if (!appContainer.isRegistered(SERVICE_TOKENS.poolManager)) {
        poolManager = findInScene(PoolManager);
        if (poolManager) {
            appContainer.registerInstance(SERVICE_TOKENS.poolManager, poolManager);
        }
    } else {
        poolManager = appContainer.resolve(SERVICE_TOKENS.poolManager);
    }

    if (!appContainer.isRegistered(SERVICE_TOKENS.effectManager)) {
        if (!audioManager) {
            audioManager = findInScene(AudioManager);
        }
        if (!poolManager) {
            poolManager = findInScene(PoolManager);
        }

        if (audioManager && poolManager) {
            appContainer.registerInstance(
                SERVICE_TOKENS.effectManager,
                new EffectManager(poolManager, audioManager)
            );
        }
    }
}
