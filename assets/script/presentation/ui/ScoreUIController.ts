import GameSignals from "../../Gameplay/Session/GameSignals";
import GameStore from "../../Gameplay/Session/GameStore";
import {registerDefaultServices} from "../../Core/registerDefaultServices";
import {appContainer} from "../../Core/DiContainer";
import {SERVICE_TOKENS} from "../../Core/ServiceTokens";

const {ccclass, property} = cc._decorator;

@ccclass
export default class ScoreUIController extends cc.Component {
    @property(cc.Label)
    scoreLabel: cc.Label = null;

    @property(cc.Label)
    movesLabel: cc.Label = null;

    private gameSignals: GameSignals;
    private gameStore: GameStore;

    onLoad() {
        registerDefaultServices();
        this.gameSignals = appContainer.resolve(SERVICE_TOKENS.gameSignals);
        this.gameStore = appContainer.resolve(SERVICE_TOKENS.gameStore);
        this.gameSignals.on(GameSignals.EVT_SCORE_CHANGED, this.updateScore, this);
        this.gameSignals.on(GameSignals.EVT_MOVES_CHANGED, this.updateMoves, this);

        this.updateScore(this.gameStore.score);
        this.updateMoves(this.gameStore.moves);
    }

    private updateScore(value: number) {
        if (this.scoreLabel) {
            this.scoreLabel.string = `${value} / ${this.gameStore.targetScore}`;
            ScoreUIController.playBounce(this.scoreLabel.node);
        }
    }

    private updateMoves(value: number) {
        if (this.movesLabel) {
            this.movesLabel.string = `${value}`;
            ScoreUIController.playBounce(this.movesLabel.node);
        }
    }

    private static playBounce(node: cc.Node) {
        cc.tween(node)
            .to(0.05, {scale: 1.1})
            .to(0.1, {scale: 1.0})
            .start();
    }

    onDestroy() {
        this.gameSignals.off(GameSignals.EVT_SCORE_CHANGED, this.updateScore, this);
        this.gameSignals.off(GameSignals.EVT_MOVES_CHANGED, this.updateMoves, this);
    }
}
