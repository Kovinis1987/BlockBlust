import GameSignals from "../../gameplay/session/GameSignals";
import GameStore from "../../gameplay/session/GameStore";

const {ccclass, property} = cc._decorator;

export interface ScoreUiDependencies {
    gameSignals: GameSignals;
    gameStore: GameStore;
}

@ccclass
export default class ScoreUIController extends cc.Component {
    @property(cc.Label)
    scoreLabel: cc.Label = null;

    @property(cc.Label)
    movesLabel: cc.Label = null;

    private gameSignals: GameSignals;
    private gameStore: GameStore;

    onLoad() {
    }

    public initialize(dependencies: ScoreUiDependencies): void {
        if (this.gameSignals) {
            this.gameSignals.off(GameSignals.EVT_SCORE_CHANGED, this.updateScore, this);
            this.gameSignals.off(GameSignals.EVT_MOVES_CHANGED, this.updateMoves, this);
        }

        this.gameSignals = dependencies.gameSignals;
        this.gameStore = dependencies.gameStore;
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
        if (!this.gameSignals) {
            return;
        }

        this.gameSignals.off(GameSignals.EVT_SCORE_CHANGED, this.updateScore, this);
        this.gameSignals.off(GameSignals.EVT_MOVES_CHANGED, this.updateMoves, this);
    }
}
