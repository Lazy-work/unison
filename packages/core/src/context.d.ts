import { EffectScope } from "#vue-internals/reactivity/effectScope.js";
import { WatchEffectOptions } from "#vue-internals/runtime-core/apiWatch.js";
import { LifecycleHooks } from '#vue-internals/runtime-core/enums.js';
import { EventType, Event } from "./types";
import { BridgePluginClass, BridgePlugin } from "./plugins";

// pre
// post
// sync
// layout
// insertion
type FlushType = WatchEffectOptions['flush'];
type OnFlushCallback = (event: Partial<Event>) => void;

export declare class Context {
    #private;
    bfpre: OnFlushCallback[] | null;
    afpre: OnFlushCallback[] | null;
    bfapre: OnFlushCallback[] | null;
    afapre: OnFlushCallback[] | null;
    bfpost: OnFlushCallback[] | null;
    afpost: OnFlushCallback[] | null;
    bfapost: OnFlushCallback[] | null;
    afapost: OnFlushCallback[] | null;
    bfi: OnFlushCallback[] | null;
    afi: OnFlushCallback[] | null;
    bfai: OnFlushCallback[] | null;
    afai: OnFlushCallback[] | null;
    bfl: OnFlushCallback[] | null;
    afl: OnFlushCallback[] | null;
    bfal: OnFlushCallback[] | null;
    afal: OnFlushCallback[] | null;
    bc: Function[] | null;
    c: Function[] | null;
    bm: Function[] | null;
    m: Function[] | null;
    bu: Function[] | null;
    u: Function[] | null;
    um: Function[] | null;
    bum: Function[] | null;
    da: Function[] | null;
    a: Function[] | null;
    rtg: Function[] | null;
    rtc: Function[] | null;
    ec: Function[] | null;
    sp: Function[] | null;
    appContext: {
        config: {};
    };
    constructor();
    get parent(): any;
    init(): void;
    get isRunning(): boolean;
    setPlugin(key: BridgePluginClass, plugin: BridgePlugin): void;
    getPlugin<T extends BridgePluginClass>(key: T): InstanceType<T> | undefined;
    set children(children: () => React.ReactNode);
    setupState(): void;
    triggerRendering(): void;
    invalidateChildren(): void;
    render(): React.ReactNode;
    queueEffect(flush: FlushType, index: number): void;
    isMounted(): boolean;
    getEffectPosition(): number;
    computeHooks(type: LifecycleHooks): void;
    computeListeners(type: EventType, event?: Partial<Event>): void;
    resetPendingQueues(): void;
    addEventListener(type: EventType, listener: OnFlushCallback): void;
    flushPreUntil(index: number): void;
    hasPendingPreEffects(): boolean;
    flushPreEffects(): void;
    runEffects(): void;
    get id(): number;
    get scope(): EffectScope;
    isExecuted(): boolean;
    isFastRefresh(): boolean;
    executed(): void;
    get nbExecution(): number;
    defineProps(keys: string[]): void;
    trackPropsDynamically<T extends Record<string, any>>(props: T): any;
    trackPropsStatically<T extends Record<string, any>>(props: T): any;
    trackProps<T extends Record<string, any>>(props: T): any;
}
