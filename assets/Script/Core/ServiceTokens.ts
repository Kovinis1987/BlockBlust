import {Token} from "./DiContainer";
import LevelManager from "../Gameplay/Session/LevelManager";
import AudioManager from "../Infrastructure/Audio/AudioManager";
import EffectManager from "../Infrastructure/Effects/EffectManager";
import PoolManager from "../Infrastructure/Pooling/PoolManager";
import GameSignals from "../Gameplay/Session/GameSignals";
import GameSessionService from "../Gameplay/Session/GameSessionService";
import GameStateMachine from "../Gameplay/Session/GameStateMachine";
import GameStore from "../Gameplay/Session/GameStore";

export const SERVICE_TOKENS = {
    gameSignals: "service.signals" as Token<GameSignals>,
    gameStore: "service.store" as Token<GameStore>,
    gameStateMachine: "service.state-machine" as Token<GameStateMachine>,
    gameSessionService: "service.session" as Token<GameSessionService>,
    levelManager: "service.level" as Token<LevelManager>,
    audioManager: "service.audio" as Token<AudioManager>,
    effectManager: "service.effect" as Token<EffectManager>,
    poolManager: "service.pool" as Token<PoolManager>,
};
