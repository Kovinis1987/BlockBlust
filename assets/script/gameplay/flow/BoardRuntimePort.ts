export interface GridCoord {
    r: number;
    c: number;
}

export interface BoardRuntimePort {
    hasTileAt(r: number, c: number): boolean;
    countTilesAt(coords: GridCoord[]): number;
    shakeTile(r: number, c: number): void;
    destroyTileAt(r: number, c: number, onComplete: () => void): boolean;
    recycleBoosterAt(r: number, c: number, type: number): boolean;
    spawnBooster(r: number, c: number, type: number): void;
    getScreenPosition(r: number, c: number): cc.Vec2;
    toWorldPosition(localPosition: cc.Vec2): cc.Vec2;
    spawnCrossFx(position: cc.Vec2): void;
    spawnExplosionFx(position: cc.Vec2, fxType: number): void;
    showScore(position: cc.Vec2, points: number): void;
    shakeCamera(): void;
    playSound(name: string): void;
    schedule(callback: () => void, delay: number): void;
    processPhysics(onComplete: () => void): void;
}
