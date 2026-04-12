export default class GameSignals {
    public static readonly EVT_RESTART = "request-restart";
    public static readonly EVT_CONTINUE = "request-continue";
    public static readonly EVT_NEXT_LEVEL = "request-next-level";
    public static readonly EVT_BOOSTER_TELEPORT = "booster-teleport-toggle";
    public static readonly EVT_BOOSTER_BOMB = "booster-bomb-toggle";
    public static readonly EVT_STATE_CHANGED = "state-changed";
    public static readonly EVT_SCORE_CHANGED = "score-changed";
    public static readonly EVT_MOVES_CHANGED = "moves-changed";
    public static readonly EVT_SHUFFLE_CHANGED = "shuffle-changed";
    public static readonly EVT_TELEPORT_CHANGED = "teleport-changed";
    public static readonly EVT_BOMB_CHANGED = "bomb-changed";

    private readonly eventTarget: cc.EventTarget = new cc.EventTarget();

    public on(type: string, callback: Function, target?: unknown): void {
        this.eventTarget.on(type, callback, target);
    }

    public off(type: string, callback?: Function, target?: unknown): void {
        this.eventTarget.off(type, callback, target);
    }

    public emit(type: string, arg1?: unknown, arg2?: unknown, arg3?: unknown, arg4?: unknown, arg5?: unknown): void {
        this.eventTarget.emit(type, arg1, arg2, arg3, arg4, arg5);
    }
}
