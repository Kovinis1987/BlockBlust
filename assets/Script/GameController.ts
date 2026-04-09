import GameConfig from "./Config/GameConfig";
import LevelManager, {LoadedLevelData} from "./Service/LevelManager";
import TileComponent from "./Component/TileComponent";
import GridModel from "./Component/GridModel";
import BoosterButtonTeleport from "./Component/BoosterButtonTeleport";
import BoosterBombButton from "./Component/BoosterBombButton";
import {GameState} from "./Enum/GameState";
import PoolManager from "./Service/PoolManager";
import DataService from "./Service/DataService";
import AudioManager from "./Service/AudioManager";
import EffectManager from "./Service/EffectManager";
import EffectTypes from "./Enum/EffectTypes";
import {TileType} from "./Enum/TileType";
import GameBoardHelper from "./Service/GameBoardHelper";
import BoosterResolutionService, {BoosterPlan} from "./Service/BoosterResolutionService";
import GridPhysicsService from "./Service/GridPhysicsService";
import {appContainer} from "./Core/DiContainer";
import {SERVICE_TOKENS} from "./Core/ServiceTokens";
import {registerDefaultServices} from "./Core/registerDefaultServices";

const {ccclass, property} = cc._decorator;

@ccclass
export default class GameController extends cc.Component {
    @property(cc.Node)
    gridContainer: cc.Node = null;
    
    @property(BoosterButtonTeleport)
    boosterButtonTeleport: BoosterButtonTeleport = null;

    @property(BoosterBombButton)
    boosterButtonBomb: BoosterBombButton = null;

    @property(cc.Prefab)
    obstaclePrefab: cc.Prefab = null;

    @property(GameConfig)
    config: GameConfig = null;

    private model: GridModel = null;
    private isProcessing: boolean = false;
    private tileSizeX: number = 100;
    private tileSizeY: number = 112;

    private _currentRows: number = 8;
    private _currentCols: number = 8;
    private _activeExplosionsCount: number = 0;

    private firstTile: cc.Node | null = null;
    private secondTile: cc.Node | null = null;

    private data: DataService;
    private gridPhysicsService: GridPhysicsService = new GridPhysicsService();
    private levelManager: LevelManager;
    private audioManager: AudioManager;
    private effectManager: EffectManager;
    private poolManager: PoolManager;

    public onLoad() {
        registerDefaultServices();
        this.data = appContainer.resolve(SERVICE_TOKENS.dataService);
        this.levelManager = appContainer.resolve(SERVICE_TOKENS.levelManager);
        this.audioManager = appContainer.resolve(SERVICE_TOKENS.audioManager);
        this.effectManager = appContainer.resolve(SERVICE_TOKENS.effectManager);
        this.poolManager = appContainer.resolve(SERVICE_TOKENS.poolManager);

        this.data.eventTarget.on(DataService.EVT_CONTINUE, this.handleContinue, this);
        this.boosterButtonTeleport.node.on(DataService.EVT_BOOSTER_TELEPORT, this.onTeleportModeToggle, this);
        this.boosterButtonBomb.node.on(DataService.EVT_BOOSTER_BOMB, this.onBombModeToggle, this);
        this.data.eventTarget.on(DataService.EVT_RESTART, this.onRestart, this);
        this.data.eventTarget.on(DataService.EVT_NEXT_LEVEL, this.onNextLevel, this);


        this.loadCurrentLevel();
    }

    private loadCurrentLevel() {
        this.loadCurrentLevelFlow(true, false);
    }

    private loadCurrentLevelFlow(resetLevelProgress: boolean, checkMovesAfterLoad: boolean) {
        this.runLevelLoad((onComplete) => this.levelManager.loadCurrentLevel(onComplete), resetLevelProgress, checkMovesAfterLoad);
    }

    private reloadCurrentLevelFlow(resetLevelProgress: boolean, checkMovesAfterLoad: boolean) {
        this.runLevelLoad((onComplete) => this.levelManager.reloadCurrentLevel(onComplete), resetLevelProgress, checkMovesAfterLoad);
    }

    private runLevelLoad(
        loader: (onComplete: (data: LoadedLevelData) => void) => void,
        resetLevelProgress: boolean,
        checkMovesAfterLoad: boolean
    ) {
        this.isProcessing = true;
        this.gridContainer.removeAllChildren();

        loader((levelData: LoadedLevelData) => {
            this.setupGame(levelData.rows, levelData.cols, levelData.tiles);

            if (resetLevelProgress) {
                this.data.resetLevel(
                    levelData.levelIndex,
                    levelData.moves,
                    levelData.targetScore
                );
            }

            this.isProcessing = false;
            if (checkMovesAfterLoad) {
                this.checkPossibleMoves();
            }
        });
    }

    private setupGame(rows: number, cols: number, tilesData: number[] | null) {
        this._currentRows = rows;
        this._currentCols = cols;
        this.setupGridSize(rows, cols);
        this.model = new GridModel(rows, cols, this.config);

        this.gridContainer.removeAllChildren();

        if (this.tileSizeX <= 0) this.tileSizeX = 100;
        if (this.tileSizeY <= 0) this.tileSizeY = 112;

        this.adaptGridScale();

        this.spawnWithJuice(rows, cols, tilesData);
    }

    private async spawnWithJuice(rows: number, cols: number, tilesData: number[] | null) {
        if (!this.model) return;

        this.isProcessing = true;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const dataIdx = (rows - 1 - r) * cols + c;
                const rawValue = tilesData ? tilesData[dataIdx] : 0;

                let node: cc.Node = null;

                if (GameBoardHelper.isObstacleType(rawValue)) {
                    this.model.setTile(r, c, TileType.OBSTACLE);
                    node = this.spawnObstacle(r, c);
                } else if (GameBoardHelper.isBoosterType(rawValue)) {
                    this.model.setTile(r, c, rawValue);
                    node = this.poolManager.getBooster(rawValue);
                    this.configureTileNode(node, rawValue, r, c);
                } else {
                    const colorID = rawValue === TileType.EMPTY
                        ? (Math.floor(Math.random() * 4) + TileType.RED)
                        : rawValue;
                    this.model.setTile(r, c, colorID);
                    node = this.spawnTile(r, c, colorID);
                }

                if (node) {
                    node.scale = 0;
                    const delay = (r * 0.05) + (c * 0.01);
                    cc.tween(node)
                        .delay(delay)
                        .to(0.3, {scale: 1}, {easing: 'backOut'})
                        .start();
                }
            }
        }

        this.scheduleOnce(() => {
            this.isProcessing = false;
        }, 0.5);
    }

    private spawnTile(r: number, c: number, colorID: number): cc.Node {
        const tileNode = this.poolManager.getTile();
        this.configureTileNode(tileNode, colorID, r, c);
        return tileNode;
    }

    private spawnObstacle(r: number, c: number): cc.Node {
        const node = cc.instantiate(this.obstaclePrefab);
        node.parent = this.gridContainer;
        const pos = this.getScreenPosition(r, c);
        node.setPosition(pos.x, pos.y);
        return node;
    }

    private spawnBooster(r: number, c: number, type: number) {
        this.model.setTile(r, c, type);
        const node = this.poolManager.getBooster(type);
        this.configureTileNode(node, type, r, c);
    }

    private configureTileNode(node: cc.Node, type: number, r: number, c: number) {
        node.parent = this.gridContainer;
        const pos = this.getScreenPosition(r, c);
        node.setPosition(cc.v3(pos.x, pos.y, 0));

        const comp = node.getComponent(TileComponent);
        comp.init(type, r, c, (row, col) => this.onTileClick(row, col));
    }

    private getScreenPosition(r: number, c: number): cc.Vec2 {
        const g = this.config.grid;
        const gridW = this.gridContainer.width;
        const gridH = this.gridContainer.height;

        const x = -gridW / 2 + g.paddingLeft + (c * (this.tileSizeX + g.spacingX)) + (this.tileSizeX / 2);
        const y = -gridH / 2 + g.paddingBottom + (r * (this.tileSizeY + g.spacingY)) + (this.tileSizeY / 2);

        return cc.v2(x, y);
    }

    private adaptGridScale() {
        const maxW = cc.winSize.width - 80;
        const maxH = cc.winSize.height - 450;
        const gridW = this._currentCols * this.tileSizeX;
        const gridH = this._currentRows * this.tileSizeY;
        const scaleX = maxW / gridW;
        const scaleY = maxH / gridH;
        this.gridContainer.scale = Math.min(scaleX, scaleY, 1);
        this.gridContainer.opacity = 0;
        cc.tween(this.gridContainer)
            .to(0.3, {opacity: 255})
            .start();
    }

    private setupGridSize(rows: number, cols: number) {
        const pLeft = 55, pRight = 55, pTop = 55, pBottom = 55;
        const spacingX = 4, spacingY = 4;

        const totalW = pLeft + pRight + (cols * this.tileSizeX) + ((cols - 1) * spacingX);
        const totalH = pTop + pBottom + (rows * this.tileSizeY) + ((rows - 1) * spacingY);

        this.gridContainer.setContentSize(totalW, totalH);
    }

    private handleBombClick(centerR: number, centerC: number): boolean {
        const node = this.getNodeAt(centerR, centerC);
        if (!node || GameBoardHelper.isObstacleType(this.model.getTile(centerR, centerC))) {
            return false;
        }

        const radius = this.config.boosters.bombRadius;
        const positions: Array<{ r: number; c: number; node: cc.Node; type: number }> = [];

        for (const {r, c} of GameBoardHelper.collectSquareCells(centerR, centerC, radius, this._currentRows, this._currentCols)) {
            const tileNode = this.getNodeAt(r, c);
            const type = this.model.getTile(r, c);
            if (tileNode && !GameBoardHelper.isObstacleType(type)) {
                positions.push({r, c, node: tileNode, type});
            }
        }

        if (positions.length === 0) {
            return false;
        }

        this.isProcessing = true;
        this.effectManager.shakeCamera();

        const pos = this.getScreenPosition(centerR, centerC);
        this.effectManager.spawnExplosionFX(this.gridContainer, pos, EffectTypes.BOMB);
        this.audioManager.play('booster');

        for (const { r, c, type } of positions) {
            if (GameBoardHelper.isBoosterType(type)) {
                this.activateBooster(r, c, type);
            }
        }

        const coordsToClear = positions.map(p => ({ r: p.r, c: p.c }));
        this.model.clearCells(coordsToClear);

        this.awardScoreForNodes(positions, pos);

        let pendingAnimations = 0;
        for (const { type, node } of positions) {
            const comp = node.getComponent(TileComponent);

            if (!GameBoardHelper.isBoosterType(type)) {
                pendingAnimations++;
                comp.destroyTile(() => {
                    this.poolManager.putTile(node);
                    pendingAnimations--;
                    if (pendingAnimations <= 0) {
                        this.finishBombUse();
                    }
                });
            }
        }

        if (pendingAnimations === 0) {
            this.finishBombUse();
        }
        return true;
    }    
    private handleTeleportClick(r: number, c: number) {
        const node = this.getNodeAt(r, c);
        if (!node || GameBoardHelper.isObstacleType(this.model.getTile(r, c))) return;

        if (this.firstTile === null) {
            this.firstTile = node;
            cc.tween(node)
                .to(0.1, { scale: 1.2 })
                .call(() => {
                    node.zIndex = 100;
                    node.parent.sortAllChildren();
                })
                .start();
        } else if (this.firstTile === node) {
            this.clearTeleportSelection();
        } else {
            this.secondTile = node;
            this.performTeleportSwap();
        }
    }

    private performTeleportSwap() {
        if (!this.firstTile || !this.secondTile) return;

        const comp1 = this.firstTile.getComponent(TileComponent);
        const comp2 = this.secondTile.getComponent(TileComponent);
        const pos1 = this.firstTile.position;
        const pos2 = this.secondTile.position;

        const gridPos1 = comp1.gridPos;
        const gridPos2 = comp2.gridPos;

        const tempType = this.model.getTile(gridPos1.y, gridPos1.x);
        this.model.setTile(gridPos1.y, gridPos1.x, this.model.getTile(gridPos2.y, gridPos2.x));
        this.model.setTile(gridPos2.y, gridPos2.x, tempType);

        this.isProcessing = true;

        cc.tween(this.firstTile)
            .to(0.3, { position: pos2 }, { easing: 'quadOut' })
            .call(() => {
                comp1.gridPos = cc.v2(gridPos2.x, gridPos2.y);
                this.firstTile.zIndex = 0;
                this.firstTile.parent.sortAllChildren();
            })
            .start();

        cc.tween(this.secondTile)
            .to(0.3, { position: pos1 }, { easing: 'quadOut' })
            .call(() => {
                comp2.gridPos = cc.v2(gridPos1.x, gridPos1.y);
                this.secondTile.zIndex = 0;
                this.secondTile.parent.sortAllChildren();
                this.finishTeleport();
            })
            .start();

        this.audioManager.play('switch');
    }

    private finishTeleport() {
        this.isProcessing = false;
        this.data.setGameState(GameState.PLAYING);
        this.data.useTeleportBooster();

        this.clearTeleportSelection();
        this.checkPossibleMoves();
    }

    private finishBombUse() {
        this.isProcessing = false;
        this.data.setGameState(GameState.PLAYING);
        this.data.useBombBooster();

        this.processGridPhysics();
    }

    private clearTeleportSelection() {
        if (this.firstTile) {
            cc.tween(this.firstTile).to(0.1, { scale: 1 }).start();
            this.firstTile.zIndex = 0;
            this.firstTile = null;
        }
        if (this.secondTile) {
            cc.tween(this.secondTile).to(0.1, { scale: 1 }).start();
            this.secondTile.zIndex = 0;
            this.secondTile = null;
        }
        if (this.firstTile || this.secondTile) {
            cc.director.getScene().getChildByName('Canvas').getChildByName('Grid').sortAllChildren();
        }
    }

    private tryBlast(r: number, c: number) {
        if (this.isProcessing || this.data.gameState !== GameState.PLAYING) return;

        const group = this.model.findGroup(r, c);
        if (group.length < 3) {
            this.getNodeAt(r, c).getComponent(TileComponent).shake();
            return;
        }

        this.data.useMove();

        const nodesToDestroy = this.getNodesByCoords(group);
        const tileNode = this.getNodeAt(r, c);
        
        this.awardScoreForNodes(nodesToDestroy.map(node => {
            const comp = node.getComponent(TileComponent);
            return { node, r: comp.gridPos.y, c: comp.gridPos.x };
        }), tileNode.getPosition());

        const boosterData = this.model.getBoosterType(group);
        this.model.clearCells(group);

        let count = 0;
        nodesToDestroy.forEach(node => {
            node.getComponent(TileComponent).destroyTile(() => {
                this.poolManager.putTile(node);
                count++;
                if (count === nodesToDestroy.length) {
                    if (boosterData) {
                        this.spawnBooster(r, c, boosterData.type);
                    }
                    this.processGridPhysics();
                }
            });
        });
    }

    private onTileClick(r: number, c: number) {
        if (this.isProcessing) return;

        if (this.data.gameState === GameState.BOOSTER_BOMB) {
            const didUseBomb = this.handleBombClick(r, c);
            if (didUseBomb) {
                this.data.useMove();
            }
            return;
        }
        
        this.audioManager.play('click');

        if (this.data.gameState === GameState.BOOSTER_TELEPORT) {
            this.handleTeleportClick(r, c);
            return;
        } 
        
        if (this.data.gameState === GameState.PLAYING) {
            const type = this.model.getTile(r, c);
            if (GameBoardHelper.isBoosterType(type)) {
                this.activateBooster(r, c, type);
                this.data.useMove();
            } else {
                this.tryBlast(r, c);
            }
        }
    }

    private handleContinue() {
        const extra = this.config.economy.continueMoves;
        this.data.continueGame(extra);

        if (!this.model.hasAvailableMoves(this.config.economy.minMatch)) {
            this.shuffleGrid();
        }
    }

    private onRestart() {
        this.reloadCurrentLevelFlow(true, false);
    }

    private onNextLevel() {
        this.loadCurrentLevelFlow(true, true);
    }

    private checkPossibleMoves() {
        if (this.data.checkLoseCondition()) {
            return;
        }

        if (this.data.score >= this.data.targetScore) {
            return;
        }

        if (!this.model.hasAvailableMoves(this.config.economy.minMatch)) {
            if (this.data.useShuffle()) {
                this.shuffleGrid();
            } else {
                if (this.data.score < this.data.targetScore) {
                    this.data.setGameState(GameState.LOST);
                }
            }
        }
    }

    private shuffleGrid() {
        this.model.shuffleOnlyColors();
        this.gridContainer.children.forEach(node => {
            const comp = node.getComponent(TileComponent);
            if (!comp) return;
            const newType = this.model.getTile(comp.gridPos.y, comp.gridPos.x);
            comp.init(newType, comp.gridPos.y, comp.gridPos.x, (r, c) => this.onTileClick(r, c));
        });
    }

    private processGridPhysics() {
        this.gridPhysicsService.process({
            model: this.model,
            gridContainer: this.gridContainer,
            currentRows: this._currentRows,
            tileSizeY: this.tileSizeY,
            poolManager: this.poolManager,
            getNodeAt: (r, c) => this.getNodeAt(r, c),
            getScreenPosition: (r, c) => this.getScreenPosition(r, c),
            onTileClick: (r, c) => this.onTileClick(r, c),
            onComplete: () => this.finalizePhysics(),
        });
    }

    private finalizePhysics() {
        this.isProcessing = false;
        
        if (this.data.checkWinCondition()) {
            return;
        }

        if (this.data.checkLoseCondition()) {
            return;
        }

        this.checkPossibleMoves();
    }

    private getNodesByCoords(coords: { r: number, c: number }[]): cc.Node[] {
        return this.gridContainer.children.filter(node => {
            const comp = node.getComponent(TileComponent);
            if (!comp) return false;
            const cp = comp.gridPos;
            return coords.some(c => c.r === cp.y && c.c === cp.x);
        });
    }

    private getNodeAt(r: number, c: number): cc.Node {
        return this.gridContainer.children.find(node => {
            const comp = node.getComponent(TileComponent);
            if (!comp) return false;
            return comp.gridPos.y === r && comp.gridPos.x === c;
        });
    }
    
    private activateBooster(r: number, c: number, type: number) {
        const neighborBooster = BoosterResolutionService.findNeighborBooster(
            r,
            c,
            this._currentRows,
            this._currentCols,
            (row, col) => this.model.getTile(row, col)
        );

        if (neighborBooster) {
            const plan = BoosterResolutionService.buildComboPlan(
                r,
                c,
                type,
                neighborBooster.type,
                this._currentRows,
                this._currentCols,
                this.config.boosters.bombRadius
            );
            this.executeBoosterPlan(r, c, plan);
        } else {
            const plan = BoosterResolutionService.buildSinglePlan(
                r,
                c,
                type,
                this._currentRows,
                this._currentCols,
                this.config.boosters.bombRadius
            );
            this.executeBoosterPlan(r, c, plan);
        }
    }

    private executeBoosterPlan(r: number, c: number, plan: BoosterPlan) {
        this.isProcessing = true;
        const pos = this.getScreenPosition(r, c);

        if (plan.playCrossFx) {
            this.effectManager.spawnCrossFX(this.gridContainer, pos);
        }

        if (plan.preExplosionFxType !== undefined) {
            this.effectManager.spawnExplosionFX(this.gridContainer, pos, plan.preExplosionFxType);
        }

        this.executeExplosion(plan.affected, {r, c}, plan.fxType);
    }

    private onTeleportModeToggle(event: cc.Event.EventCustom) {
        const { active } = event.detail;
        if (active) {
            this.data.setGameState(GameState.BOOSTER_TELEPORT);
            
            this.audioManager.play('click');
        } else {
            this.data.setGameState(GameState.PLAYING);
            this.clearTeleportSelection();
        }
    }

    private onBombModeToggle(event: cc.Event.EventCustom) {
        const { active } = event.detail;

        if (active) {
            this.data.setGameState(GameState.BOOSTER_BOMB);

            this.clearTeleportSelection();
            this.audioManager.play('click');
        } else {
            this.data.setGameState(GameState.PLAYING);
        }
    }

    private async executeExplosion(
        coords: { r: number, c: number }[],
        epicenter?: { r: number, c: number },
        fxType: number = 0
    ) {
        this._activeExplosionsCount++;
        this.effectManager.shakeCamera();

        if (epicenter) {
            BoosterResolutionService.sortCoordsByEpicenter(coords, epicenter);
            this.removeEpicenterNode(epicenter, fxType);
        }

        const nodesToDestroy = this.getNodesByCoords(coords);
        if (nodesToDestroy.length === 0) {
            this.finishExplosionWave();
            return;
        }

        nodesToDestroy.forEach((node, index) => {
            const delay = index * this.config.animations.blastWaveDelay;
            this.scheduleOnce(() => {
                this.processSingleNodeExplosion(node, epicenter);
                if (index === nodesToDestroy.length - 1) {
                    this.finishExplosionWave();
                }
            }, delay);
        });
    }

    private awardScoreForNodes(
        nodes: Array<{ node: cc.Node; r: number; c: number }>,
        pos: cc.Vec2
    ) {
        const worldPos = this.gridContainer.convertToWorldSpaceAR(pos);
        const normalTiles = nodes.filter(n => {
            const type = n.node.getComponent(TileComponent).type;
            return GameBoardHelper.isColorType(type);
        });

        if (normalTiles.length > 0) {
            const points = normalTiles.length * this.config.economy.scoreTile;
            this.data.addScore(points);
            this.effectManager.showScoreAnimation(worldPos, points);
        }
    }

    private removeEpicenterNode(epi: { r: number, c: number }, fxType: number) {
        const epiNode = this.getNodeAt(epi.r, epi.c);
        if (!epiNode) return;

        const type = epiNode.getComponent(TileComponent).type;
        const pos = this.getScreenPosition(epi.r, epi.c);

        this.effectManager.spawnExplosionFX(this.gridContainer, pos, fxType);

        this.model.clearCells([epi]);
        this.poolManager.putBooster(epiNode, type);
    }

    private processSingleNodeExplosion(
        node: cc.Node,
        epicenter?: { r: number, c: number }
    ) {
        if (!cc.isValid(node)) return;

        const comp = node.getComponent(TileComponent);
        const {y: r, x: c} = comp.gridPos;
        const type = comp.type;
        const pos = this.getScreenPosition(r, c);

        const isNotEpicenter = !epicenter || (r !== epicenter.r || c !== epicenter.c);
        if (isNotEpicenter) {
            const fxType = GameBoardHelper.getEffectTypeForTile(type);
            this.effectManager.spawnExplosionFX(this.gridContainer, pos, fxType);
        }

        if (GameBoardHelper.isBoosterType(type)) {
            this.handleBoosterChainReaction(r, c, type, epicenter, node);
        } else {
            this.handleRegularTileDestruction(node, r, c);
        }
    }

    private handleRegularTileDestruction(node: cc.Node, r: number, c: number) {
        if (!cc.isValid(node) || !node.parent) return;

        this.model.clearCells([{r, c}]);
        const localPos = this.getScreenPosition(r, c);
        const worldPos = this.gridContainer.convertToWorldSpaceAR(localPos);
        const points = this.config.economy.scoreTile;
        this.data.addScore(points);
        this.effectManager.showScoreAnimation(worldPos, points);

        node.getComponent(TileComponent).destroyTile(() => {
            this.poolManager.putTile(node);
        });
    }

    private handleBoosterChainReaction(r: number, c: number, type: number, epicenter: {
        r: number,
        c: number
    }, node: cc.Node) {
        const isNotEpicenter = !epicenter || (r !== epicenter.r || c !== epicenter.c);
        if (isNotEpicenter) {
            this.model.clearCells([{r, c}]);
            this.activateBooster(r, c, type);
            this.poolManager.putBooster(node, type); // ✅ Правильный пул!
        }
    }

    private finishExplosionWave() {
        this._activeExplosionsCount--;
        if (this._activeExplosionsCount <= 0) {
            this._activeExplosionsCount = 0;
            this.processGridPhysics();
        }
    }

    public onDestroy() {
        this.data.eventTarget.off(DataService.EVT_CONTINUE, this.handleContinue, this);
        this.boosterButtonTeleport.node.off(DataService.EVT_BOOSTER_TELEPORT, this.onTeleportModeToggle, this);
        this.boosterButtonBomb.node.off(DataService.EVT_BOOSTER_BOMB, this.onBombModeToggle, this);
        this.data.eventTarget.off(DataService.EVT_RESTART, this.onRestart, this);
        this.data.eventTarget.off(DataService.EVT_NEXT_LEVEL, this.onNextLevel, this);
    }
}
