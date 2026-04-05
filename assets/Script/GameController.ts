import PoolManager from "./PoolManager";
import DataService from "./DataService";
import AudioManager from "./AudioManager";
import GameConfig from "./Config/GameConfig";
import LevelManager from "./Service/LevelManager";
import EffectManager from "./Service/EffectManager";
import TileComponent from "./Component/TileComponent";
import GridModel from "./Component/GridModel";
import BoosterButtonTeleport from "./Component/BoosterButtonTeleport";
import BoosterBombButton from "./Component/BoosterBombButton";
import {GameState} from "./Enum/GameState";

const {ccclass, property} = cc._decorator;

@ccclass
export default class GameController extends cc.Component {
    @property(cc.Node)
    gridContainer: cc.Node = null;
    
    @property(BoosterButtonTeleport)
    boosterButtonTeleport: BoosterButtonTeleport = null;

    @property(BoosterBombButton)
    boosterButtonBomb: BoosterBombButton = null;

    @property(cc.Integer)
    currentLevel: number = 0;

    @property(cc.Prefab)
    scorePopupPrefab: cc.Prefab = null;

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

    onLoad() {
        this.data = DataService.instance;

        this.data.eventTarget.on(DataService.EVT_RESTART, this.restartLevel, this);
        this.data.eventTarget.on(DataService.EVT_CONTINUE, this.handleContinue, this);
        this.data.eventTarget.on(DataService.EVT_NEXT_LEVEL, this.onNextLevel, this);
        this.boosterButtonTeleport.node.on(DataService.EVT_BOOSTER_TELEPORT, this.onTeleportModeToggle, this);
        this.boosterButtonBomb.node.on(DataService.EVT_BOOSTER_BOMB, this.onBombModeToggle, this);

        this.loadCurrentLevel();
    }

    private loadCurrentLevel() {
        this.isProcessing = true;
        LevelManager.instance.loadLevel(this.currentLevel, (levelData) => {
            this.setupGame(levelData.rows, levelData.cols, levelData.tiles);
            this.data.resetLevel(
                this.currentLevel,
                levelData.moves ?? 25,
                levelData.targetScore ?? 1500
            );
            this.isProcessing = false;
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
        this.setupGridSize(rows, cols);

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
                const targetPos = this.getScreenPosition(r, c);

                if (rawValue === 1) {
                    this.model.setTile(r, c, 1);
                    node = this.spawnObstacle(r, c);
                } else if (rawValue >= 6 && rawValue <= 9) {
                    this.model.setTile(r, c, rawValue);
                    node = PoolManager.instance.getBooster(rawValue);
                    node.parent = this.gridContainer;
                    node.setPosition(targetPos.x, targetPos.y);

                    const comp = node.getComponent(TileComponent);
                    comp.init(rawValue, r, c, (row, col) => this.onTileClick(row, col));
                } else {
                    const colorID = rawValue === 0 ? Math.floor(Math.random() * 4) + 2 : rawValue;
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
        const tileNode = PoolManager.instance.getTile();
        tileNode.parent = this.gridContainer;

        const pos = this.getScreenPosition(r, c);
        tileNode.setPosition(cc.v3(pos.x, pos.y, 0));

        const comp = tileNode.getComponent(TileComponent);
        comp.init(colorID, r, c, (row, col) => this.onTileClick(row, col));
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
        const node = PoolManager.instance.getBooster(type);
        node.parent = this.gridContainer;
        node.setPosition(this.getScreenPosition(r, c));

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

    private handleBombClick(centerR: number, centerC: number) {
        console.log('💣 handleBombClick:', centerR, centerC);

        const node = this.getNodeAt(centerR, centerC);
        if (!node || this.model.getTile(centerR, centerC) === 1) {
            return;
        }

        const radius = this.config.boosters.bombRadius;
        const effectLevel = this.config.boosters.bombEffectLevel;

        const targets: cc.Node[] = [];
        const coordsToClear: { r: number; c: number }[] = [];

        const positions: Array<{ r: number; c: number; node: cc.Node }> = [];

        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                const r = centerR + dr;
                const c = centerC + dc;

                if (r < 0 || r >= this._currentRows || c < 0 || c >= this._currentCols) continue;

                const tileNode = this.getNodeAt(r, c);
                if (tileNode && this.model.getTile(r, c) !== 1) {
                    positions.push({ r, c, node: tileNode });
                    targets.push(tileNode);
                    coordsToClear.push({ r, c });
                }
            }
        }

        if (targets.length === 0) {
            this.finishBombUse();
            return;
        }

        this.isProcessing = true;
        EffectManager.instance.shakeCamera();

        const pos = this.getScreenPosition(centerR, centerC);
        EffectManager.instance.spawnExplosionFX(this.gridContainer, pos, effectLevel);

        for (const { r, c, node } of positions) {
            const type = this.model.getTile(r, c);
            if (type >= 6 && type <= 9) {
                console.log('💥 Бустер найден при взрыве бомбы:', r, c, 'type:', type);
                this.activateBooster(r, c, type);
            }
        }

        this.model.clearCells(coordsToClear);

        let pendingAnimations = 0;

        for (const { r, c, node } of positions) {
            const type = this.model.getTile(r, c); 
            const comp = node.getComponent(TileComponent);

            if (type < 6 || type > 9) {
                pendingAnimations++;
                comp.destroyTile(() => {
                    PoolManager.instance.putTile(node);
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
    }    private handleTeleportClick(r: number, c: number) {
        const node = this.getNodeAt(r, c);
        if (!node || this.model.getTile(r, c) === 1) return;

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

        AudioManager.instance.play('swap');
    }

    private finishTeleport() {
        this.isProcessing = false;
        this.data.setGameState(GameState.PLAYING);

        this.boosterButtonTeleport.consume();

        const event = new cc.Event.EventCustom('booster-teleport-toggle', true);
        event.detail = {active: false};
        this.boosterButtonTeleport.node.dispatchEvent(event);

        this.clearTeleportSelection();
        this.checkPossibleMoves();
        DataService.instance.teleportBoosters--;
    }

    private finishBombUse() {
        this.isProcessing = false;
        this.data.setGameState(GameState.PLAYING);

        if (this.boosterButtonBomb) {
            if (this.data.useBombBooster()) {
                this.boosterButtonBomb.consume();
            }
        }

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
        AudioManager.instance.play('click');

        const boosterData = this.model.getBoosterType(group);
        const points = group.length * 10;

        this.isProcessing = true;
        const tileNode = this.getNodeAt(r, c);
        if (tileNode) {
            const worldPos = tileNode.parent.convertToWorldSpaceAR(tileNode.getPosition());
            EffectManager.instance.showScoreAnimation(worldPos, points);
        }
        this.data.useMove();
        this.data.addScore(points);

        const nodesToDestroy = this.getNodesByCoords(group);
        this.model.clearCells(group);

        let count = 0;
        nodesToDestroy.forEach(node => {
            node.getComponent(TileComponent).destroyTile(() => {
                PoolManager.instance.putTile(node);
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
            this.handleBombClick(r, c);
            return;
        } 
        
        if (this.data.gameState === GameState.BOOSTER_TELEPORT) {
            this.handleTeleportClick(r, c);
            return;
        } 
        
        if (this.data.gameState === GameState.PLAYING) {
            const type = this.model.getTile(r, c);
            if (type >= 6 && type <= 9) {
                this.activateBooster(r, c, type);
            } else {
                this.tryBlast(r, c);
            }
        }
    }

    private handleContinue() {
        const extra = this.config.economy.continueMoves;
        DataService.instance.continueGame(extra);

        if (!this.model.hasAvailableMoves(this.config.economy.minMatch)) {
            this.shuffleGrid();
        }
    }

    private restartLevel() {
        this.gridContainer.removeAllChildren();
        this.loadCurrentLevel();
        this.isProcessing = false;
    }

    private onNextLevel() {
        this.currentLevel++;
        this.loadCurrentLevel();
    }

    private checkPossibleMoves() {
        if (!this.model.hasAvailableMoves(3)) {
            if (this.data.useShuffle()) {
                this.shuffleGrid();
            } else {
                this.data.setGameState(GameState.LOST);
            }
        }
    }

    private shuffleGrid() {
        this.model.shuffleOnlyColors();
        this.gridContainer.children.forEach(node => {
            const comp = node.getComponent(TileComponent);
            const newType = this.model.getTile(comp.gridPos.y, comp.gridPos.x);
            comp.init(newType, comp.gridPos.y, comp.gridPos.x, (r, c) => this.onTileClick(r, c));
        });
    }

    private processGridPhysics() {
        const movements = this.model.processFalling();
        let activeAnimations = 0;

        movements.forEach(move => {
            const node = this.getNodeAt(move.from.r, move.from.c);
            if (node) {
                activeAnimations++;
                const finalPos = this.getScreenPosition(move.to.r, move.to.c);
                const comp = node.getComponent(TileComponent);
                comp.gridPos.y = move.to.r;
                comp.moveTo(move.to.r, move.to.c, finalPos, () => {
                    activeAnimations--;
                    if (activeAnimations <= 0) this.finalizePhysics();
                });
            }
        });

        const news = this.model.fillEmptyCells();
        news.forEach(n => {
            activeAnimations++;
            const tileNode = PoolManager.instance.getTile();
            tileNode.parent = this.gridContainer;

            const startY = (this._currentRows * this.tileSizeY) / 2 + 200;
            const finalPos = this.getScreenPosition(n.r, n.c);

            tileNode.setPosition(finalPos.x, startY); 

            const comp = tileNode.getComponent(TileComponent);
            comp.init(n.type, n.r, n.c, (row, col) => this.onTileClick(row, col));

            comp.moveTo(n.r, n.c, finalPos, () => {
                activeAnimations--;
                if (activeAnimations <= 0) this.finalizePhysics();
            });
        });

        if (movements.length === 0 && news.length === 0) {
            this.finalizePhysics();
        }
    }

    private finalizePhysics() {
        this.isProcessing = false;
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
        const pos = this.getScreenPosition(r, c);
        EffectManager.instance.playExplosionEffects(this.gridContainer, pos, type);

        if (type === 8) {
            EffectManager.instance.spawnExplosionFX(this.gridContainer, pos, 2);
        } else if (type === 9) {
            EffectManager.instance.spawnExplosionFX(this.gridContainer, pos, 3);
        }

        const neighborBooster = this.findNeighborBooster(r, c);

        if (neighborBooster) {
            this.executeCombo(r, c, type, neighborBooster.type);
        } else {
            this.executeSingleBooster(r, c, type);
        }
    }

    private onTeleportModeToggle(event: cc.Event.EventCustom) {
        console.log("onTeleportModeToggle");
        const { active } = event.detail;
        if (active) {
            this.data.setGameState(GameState.BOOSTER_TELEPORT);

            if (this.boosterButtonBomb) {
                this.boosterButtonBomb['_isActive'] = false;
                this.boosterButtonBomb.updateVisuals();
            }
            
            AudioManager.instance.play('ui_click');
        } else {
            this.data.setGameState(GameState.PLAYING);
            this.clearTeleportSelection();
        }
    }

    private onBombModeToggle(event: cc.Event.EventCustom) {
        const { active } = event.detail;

        if (active) {
            this.data.setGameState(GameState.BOOSTER_BOMB);

            if (this.boosterButtonTeleport) {
                this.boosterButtonTeleport['_isActive'] = false;
                this.boosterButtonTeleport.updateVisuals();
            }

            this.clearTeleportSelection();
            AudioManager.instance.play('ui_click');
        } else {
            this.data.setGameState(GameState.PLAYING);
        }
    }

    private findNeighborBooster(r: number, c: number): { r: number, c: number, type: number } | null {
        const neighbors = [
            {r: r + 1, c}, {r: r - 1, c}, {r, c: c + 1}, {r, c: c - 1}
        ];
        for (const n of neighbors) {
            if (n.r >= 0 && n.r < this._currentRows && n.c >= 0 && n.c < this._currentCols) {
                const type = this.model.getTile(n.r, n.c);
                if (type >= 6 && type <= 9) return {r: n.r, c: n.c, type};
            }
        }
        return null;
    }

    private executeCombo(r1: number, c1: number, type1: number, type2: number) {
        this.isProcessing = true;
        let affected: { r: number, c: number }[] = [];
        const epicenter = {r: r1, c: c1};

        const neighbor = this.findNeighborBooster(r1, c1);
        if (!neighbor) {
            this.finishExplosionWave();
            return;
        }

        const r2 = neighbor.r;
        const c2 = neighbor.c;

        const isRocket1 = type1 === 6 || type1 === 7;
        const isRocket2 = type2 === 6 || type2 === 7;
        const isBomb = type1 === 8 || type2 === 8;

        const pos = this.getScreenPosition(r1, c1);

        affected.push(epicenter);

        affected.push({r: r2, c: c2});

        if ((isRocket1 && isRocket2) || (isRocket1 && isBomb) || (isRocket2 && isBomb)) {
            EffectManager.instance.spawnCrossFX(this.gridContainer, pos);
            if (isBomb) EffectManager.instance.spawnExplosionFX(this.gridContainer, pos, 3);

            for (let i = 0; i < this._currentCols; i++) affected.push({r: r1, c: i});
            for (let i = 0; i < this._currentRows; i++) affected.push({r: i, c: c1});
            affected = this.removeDuplicates(affected);
        } else if (type1 === 8 || type2 === 8 || type1 === 9 || type2 === 9) {
            EffectManager.instance.spawnExplosionFX(this.gridContainer, pos, 3);
            const radius = this.config.boosters.bombRadius;
            for (let i = r1 - radius; i <= r1 + radius; i++) {
                for (let j = c1 - radius; j <= c1 + radius; j++) {
                    if (i >= 0 && i < this._currentRows && j >= 0 && j < this._currentCols) {
                        affected.push({r: i, c: j});
                    }
                }
            }
            affected = this.removeDuplicates(affected);
        }

        this.executeExplosion(affected, epicenter);
    }

    private removeDuplicates(coords: { r: number; c: number }[]): { r: number; c: number }[] {
        const seen = new Set<string>();
        return coords.filter(coord => {
            const key = `${coord.r},${coord.c}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    private async executeExplosion(coords: { r: number, c: number }[], epicenter?: { r: number, c: number }) {
        this._activeExplosionsCount++;
        EffectManager.instance.shakeCamera();

        if (epicenter) {
            this.sortCoordsByEpicenter(coords, epicenter);
            this.removeEpicenterNode(epicenter);
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

    private sortCoordsByEpicenter(coords: { r: number, c: number }[], epi: { r: number, c: number }) {
        coords.sort((a, b) => {
            const distA = Math.abs(a.r - epi.r) + Math.abs(a.c - epi.c);
            const distB = Math.abs(b.r - epi.r) + Math.abs(b.c - epi.c);
            return distA - distB;
        });
    }

    private removeEpicenterNode(epi: { r: number, c: number }) {
        const epiNode = this.getNodeAt(epi.r, epi.c);
        if (!epiNode) return;

        const type = epiNode.getComponent(TileComponent).type;
        const pos = this.getScreenPosition(epi.r, epi.c);

        EffectManager.instance.playExplosionEffects(this.gridContainer, pos, type);

        this.model.clearCells([epi]);
        PoolManager.instance.putBooster(epiNode, type);
    }

    private processSingleNodeExplosion(node: cc.Node, epicenter?: { r: number, c: number }) {
        if (!cc.isValid(node)) return;

        const comp = node.getComponent(TileComponent);
        const {y: r, x: c} = comp.gridPos;
        const type = comp.type;
        const pos = this.getScreenPosition(r, c);

        EffectManager.instance.playExplosionEffects(this.gridContainer, pos, type);

        if (type >= 6 && type <= 9) {
            this.handleBoosterChainReaction(r, c, type, epicenter, node);
        } else {
            this.handleRegularTileDestruction(node, type, r, c);
        }
    }

    private handleRegularTileDestruction(node: cc.Node, type: number, r: number, c: number) {
        if (!cc.isValid(node) || !node.parent) return;

        this.model.clearCells([{r, c}]);
        const localPos = this.getScreenPosition(r, c);
        const worldPos = this.gridContainer.convertToWorldSpaceAR(localPos);
        const points = this.config.economy.scoreTile;
        this.data.addScore(points);
        EffectManager.instance.showScoreAnimation(worldPos, points);

        node.getComponent(TileComponent).destroyTile(() => {
            PoolManager.instance.putTile(node); // ✅ Только для обычных тайлов
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
            PoolManager.instance.putBooster(node, type); // ✅ Правильный пул!
        }
    }

    private finishExplosionWave() {
        this._activeExplosionsCount--;
        if (this._activeExplosionsCount <= 0) {
            this._activeExplosionsCount = 0;
            this.processGridPhysics();
        }
    }

    private executeSingleBooster(r: number, c: number, type: number) {
        let affected: { r: number, c: number }[] = [];

        switch (type) {
            case 6:
                for (let i = 0; i < this._currentCols; i++) affected.push({r, c: i});
                break;
            case 7:
                for (let i = 0; i < this._currentRows; i++) affected.push({r: i, c});
                break;
            case 8: 
                const radius = this.config.boosters.bombRadius;
                for (let i = r - radius; i <= r + radius; i++) {
                    for (let j = c - radius; j <= c + radius; j++) {
                        if (i >= 0 && i < this._currentRows && j >= 0 && j < this._currentCols) {
                            affected.push({r: i, c: j});
                        }
                    }
                }
                break;
            case 9:
                for (let i = 0; i < this._currentRows; i++) {
                    for (let j = 0; j < this._currentCols; j++) affected.push({r: i, c: j});
                }
                break;
        }

        this.executeExplosion(affected, {r, c});
    }
}