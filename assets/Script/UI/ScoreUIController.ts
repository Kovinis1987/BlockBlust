import DataService from "../Service/DataService";
import {registerDefaultServices} from "../Core/registerDefaultServices";
import {appContainer} from "../Core/DiContainer";
import {SERVICE_TOKENS} from "../Core/ServiceTokens";

const {ccclass, property} = cc._decorator;

@ccclass
export default class ScoreUIController extends cc.Component {
    @property(cc.Label)
    scoreLabel: cc.Label = null;

    @property(cc.Label)
    movesLabel: cc.Label = null;

    private dataService: DataService;

    onLoad() {
        registerDefaultServices();
        this.dataService = appContainer.resolve(SERVICE_TOKENS.dataService);
        this.dataService.eventTarget.on(DataService.EVT_SCORE_CHANGED, this.updateScore, this);
        this.dataService.eventTarget.on(DataService.EVT_MOVES_CHANGED, this.updateMoves, this);

        this.updateScore(this.dataService.score);
        this.updateMoves(this.dataService.moves);
    }

    private updateScore(value: number) {
        if (this.scoreLabel) {
            this.scoreLabel.string = `${value} / ${this.dataService.targetScore}`;
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
        this.dataService.eventTarget.off(DataService.EVT_SCORE_CHANGED, this.updateScore, this);
        this.dataService.eventTarget.off(DataService.EVT_MOVES_CHANGED, this.updateMoves, this);
    }
}
