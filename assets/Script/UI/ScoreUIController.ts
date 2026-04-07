import DataService from "../Service/DataService";

const { ccclass, property } = cc._decorator;

@ccclass
export default class ScoreUIController extends cc.Component {
    @property(cc.Label)
    scoreLabel: cc.Label = null;

    @property(cc.Label)
    movesLabel: cc.Label = null;

    private dataService : DataService;

    onLoad() {
        this.dataService = DataService.instance;
        this.dataService.eventTarget.on('score-changed', this.updateScore, this);
        this.dataService.eventTarget.on('moves-changed', this.updateMoves, this);

        this.updateScore(this.dataService.score);
        this.updateMoves(this.dataService.moves);
    }

    private updateScore(value: number) {
        if (this.scoreLabel) {
            this.scoreLabel.string = `${value} / ${DataService.instance.targetScore}`;
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
            .to(0.05, { scale: 1.1 })
            .to(0.1, { scale: 1.0 })
            .start();
    }

    onDestroy() {
        this.dataService.eventTarget.off('score-changed', this.updateScore, this);
        this.dataService.eventTarget.off('moves-changed', this.updateMoves, this);
    }
}
