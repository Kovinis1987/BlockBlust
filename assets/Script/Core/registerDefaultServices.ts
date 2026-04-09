import {appContainer} from "./DiContainer";
import {SERVICE_TOKENS} from "./ServiceTokens";
import DataService from "../Service/DataService";
import LevelManager from "../Service/LevelManager";
import EffectManager from "../Service/EffectManager";
import AudioManager from "../Service/AudioManager";
import PoolManager from "../Service/PoolManager";

function findInScene<T extends cc.Component>(type: {new(): T}): T | null {
    const scene = cc.director.getScene();
    if (!scene) return null;
    return scene.getComponentInChildren(type);
}

export function registerDefaultServices() {
    if (!appContainer.isRegistered(SERVICE_TOKENS.dataService)) {
        appContainer.registerInstance(SERVICE_TOKENS.dataService, DataService.instance);
    }

    if (!appContainer.isRegistered(SERVICE_TOKENS.levelManager)) {
        const dataService = appContainer.resolve(SERVICE_TOKENS.dataService);
        appContainer.registerInstance(SERVICE_TOKENS.levelManager, new LevelManager(dataService));
    }

    if (!appContainer.isRegistered(SERVICE_TOKENS.effectManager)) {
        appContainer.registerInstance(SERVICE_TOKENS.effectManager, EffectManager.instance);
    }

    if (!appContainer.isRegistered(SERVICE_TOKENS.audioManager)) {
        const audioManager = findInScene(AudioManager);
        if (audioManager) {
            appContainer.registerInstance(SERVICE_TOKENS.audioManager, audioManager);
        }
    }

    if (!appContainer.isRegistered(SERVICE_TOKENS.poolManager)) {
        const poolManager = findInScene(PoolManager);
        if (poolManager) {
            appContainer.registerInstance(SERVICE_TOKENS.poolManager, poolManager);
        }
    }
}
