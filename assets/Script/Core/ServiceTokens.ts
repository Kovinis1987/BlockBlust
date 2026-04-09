import {Token} from "./DiContainer";
import DataService from "../Service/DataService";
import LevelManager from "../Service/LevelManager";
import AudioManager from "../Service/AudioManager";
import EffectManager from "../Service/EffectManager";
import PoolManager from "../Service/PoolManager";

export const SERVICE_TOKENS = {
    dataService: "service.data" as Token<DataService>,
    levelManager: "service.level" as Token<LevelManager>,
    audioManager: "service.audio" as Token<AudioManager>,
    effectManager: "service.effect" as Token<EffectManager>,
    poolManager: "service.pool" as Token<PoolManager>,
};
