import GridModel from "./GridModel";
import TileComponent from "../../Presentation/Components/TileComponent";
import AudioManager from "../../Infrastructure/Audio/AudioManager";
import GameSessionService from "../Session/GameSessionService";
import GameStateMachine from "../Session/GameStateMachine";
import GameStore from "../Session/GameStore";
import GameBoardHelper from "./GameBoardHelper";

export interface BoardInputContext {
    model: GridModel;
    gameStore: GameStore;
    gameSessionService: GameSessionService;
    gameStateMachine: GameStateMachine;
    audioManager: AudioManager;
    isProcessing: boolean;
    setProcessing: (value: boolean) => void;
    getNodeAt: (r: number, c: number) => cc.Node | null;
    activateBooster: (r: number, c: number, type: number) => void;
    tryBlast: (r: number, c: number) => void;
    handleBombAt: (r: number, c: number) => boolean;
    onTeleportCompleted: () => void;
}

export default class BoardInputService {
    private firstTile: cc.Node | null = null;
    private secondTile: cc.Node | null = null;

    public handleTileClick(r: number, c: number, context: BoardInputContext): void {
        if (context.isProcessing) return;

        if (context.gameStateMachine.isBombMode()) {
            const didUseBomb = context.handleBombAt(r, c);
            if (didUseBomb) {
                context.gameSessionService.useMove();
            }
            return;
        }

        context.audioManager.play("click");

        if (context.gameStateMachine.isTeleportMode()) {
            this.handleTeleportClick(r, c, context);
            return;
        }

        if (!context.gameStateMachine.isPlaying()) {
            return;
        }

        const type = context.model.getTile(r, c);
        if (GameBoardHelper.isBoosterType(type)) {
            context.activateBooster(r, c, type);
            context.gameSessionService.useMove();
        } else {
            context.tryBlast(r, c);
        }
    }

    public clearTeleportSelection(): void {
        const firstParent = this.firstTile ? this.firstTile.parent : null;
        const secondParent = this.secondTile ? this.secondTile.parent : null;

        if (this.firstTile) {
            cc.tween(this.firstTile).to(0.1, {scale: 1}).start();
            this.firstTile.zIndex = 0;
            this.firstTile = null;
        }

        if (this.secondTile) {
            cc.tween(this.secondTile).to(0.1, {scale: 1}).start();
            this.secondTile.zIndex = 0;
            this.secondTile = null;
        }

        if (firstParent) {
            firstParent.sortAllChildren();
        }
        if (secondParent && secondParent !== firstParent) {
            secondParent.sortAllChildren();
        }
    }

    private handleTeleportClick(r: number, c: number, context: BoardInputContext): void {
        const node = context.getNodeAt(r, c);
        if (!node || GameBoardHelper.isObstacleType(context.model.getTile(r, c))) return;

        if (this.firstTile === null) {
            this.firstTile = node;
            cc.tween(node)
                .to(0.1, {scale: 1.2})
                .call(() => {
                    node.zIndex = 100;
                    if (node.parent) {
                        node.parent.sortAllChildren();
                    }
                })
                .start();
            return;
        }

        if (this.firstTile === node) {
            this.clearTeleportSelection();
            return;
        }

        this.secondTile = node;
        this.performTeleportSwap(context);
    }

    private performTeleportSwap(context: BoardInputContext): void {
        if (!this.firstTile || !this.secondTile) return;

        const firstTile = this.firstTile;
        const secondTile = this.secondTile;
        const comp1 = firstTile.getComponent(TileComponent);
        const comp2 = secondTile.getComponent(TileComponent);
        const pos1 = firstTile.position;
        const pos2 = secondTile.position;
        const gridPos1 = comp1.gridPos;
        const gridPos2 = comp2.gridPos;

        const firstTileType = context.model.getTile(gridPos1.y, gridPos1.x);
        const secondTileType = context.model.getTile(gridPos2.y, gridPos2.x);
        context.model.setTile(gridPos1.y, gridPos1.x, secondTileType);
        context.model.setTile(gridPos2.y, gridPos2.x, firstTileType);

        context.setProcessing(true);

        cc.tween(firstTile)
            .to(0.3, {position: pos2}, {easing: "quadOut"})
            .call(() => {
                comp1.gridPos = cc.v2(gridPos2.x, gridPos2.y);
                firstTile.zIndex = 0;
                if (firstTile.parent) {
                    firstTile.parent.sortAllChildren();
                }
            })
            .start();

        cc.tween(secondTile)
            .to(0.3, {position: pos1}, {easing: "quadOut"})
            .call(() => {
                comp2.gridPos = cc.v2(gridPos1.x, gridPos1.y);
                secondTile.zIndex = 0;
                if (secondTile.parent) {
                    secondTile.parent.sortAllChildren();
                }

                context.audioManager.play("switch");
                context.onTeleportCompleted();
                this.clearTeleportSelection();
            })
            .start();
    }
}
