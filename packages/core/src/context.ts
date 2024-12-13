import React, { useEffect, useInsertionEffect, useLayoutEffect, useState } from 'react';
import { isArray, NOOP } from '#vue-internals/shared/index';
import { EffectScope, shallowReactive } from '#vue-internals/reactivity/index';
import {
  flushJobsUntil,
  flushPostJobsUntil,
  getJobAt,
  switchToAuto,
  switchToManual,
} from '#vue-internals/runtime-core/scheduler';
import { warn } from '#vue-internals/runtime-core/warning';
import { getCurrentInstance } from './index';
import { LifecycleHooks } from '#vue-internals/runtime-core/enums';

import type {
  SchedulerJob,
} from '#vue-internals/runtime-core/scheduler';
import type { ComponentInternalInstance } from './index';
import { ReactiveEffect } from '#vue-internals/reactivity/index';
import type { WatchEffectOptions } from '#vue-internals/runtime-core/apiWatch';
import type { BridgePlugin, BridgePluginClass } from './plugins/index';

let id = 0;

// pre
// post
// sync
// layout
// insertion
type FlushType = WatchEffectOptions['flush'];

export const Events = {
  BEFORE_FLUSHING_PRE_EFFECT: 'bfpre',
  AFTER_FLUSHING_PRE_EFFECT: 'afpre',
  BEFORE_FLUSHING_ALL_PRE_EFFECT: 'bfapre',
  AFTER_FLUSHING_ALL_PRE_EFFECT: 'afapre',

  BEFORE_FLUSHING_POST_EFFECT: 'bfpost',
  AFTER_FLUSHING_POST_EFFECT: 'afpost',
  BEFORE_FLUSHING_ALL_POST_EFFECT: 'bfapost',
  AFTER_FLUSHING_ALL_POST_EFFECT: 'afapost',

  BEFORE_FLUSHING_INSERTION_EFFECT: 'bfi',
  AFTER_FLUSHING_INSERTION_EFFECT: 'afi',
  BEFORE_FLUSHING_ALL_INSERTION_EFFECT: 'bfai',
  AFTER_FLUSHING_ALL_INSERTION_EFFECT: 'afai',

  BEFORE_FLUSHING_LAYOUT_EFFECT: 'bfl',
  AFTER_FLUSHING_LAYOUT_EFFECT: 'afl',
  BEFORE_FLUSHING_ALL_LAYOUT_EFFECT: 'bfal',
  AFTER_FLUSHING_ALL_LAYOUT_EFFECT: 'afal',
} as const;

type EventTypes = typeof Events;

export type EventType = EventTypes[keyof EventTypes];

export type Event = {
  type: EventType;
  job?: SchedulerJob;
  index?: number;
};

type OnFlushCallback = (event: Partial<Event>) => void;
class Context {
  #id = id++;
  #parent: ComponentInternalInstance | null;
  #renderTrigger: () => void = __DEV__
    ? () => {
        warn("Can't trigger a new rendering, the state is not setup properly");
      }
    : NOOP;
  #isRunning = false;
  #propsKeys: string[] = [];
  #staticProps: boolean = false;
  #scope: EffectScope = new EffectScope(true);
  #props = shallowReactive({} as Record<string, any>);

  /* event listeners */
  // pre
  bfpre: OnFlushCallback[] | null = null;
  afpre: OnFlushCallback[] | null = null;
  bfapre: OnFlushCallback[] | null = null;
  afapre: OnFlushCallback[] | null = null;
  // post
  bfpost: OnFlushCallback[] | null = null;
  afpost: OnFlushCallback[] | null = null;
  bfapost: OnFlushCallback[] | null = null;
  afapost: OnFlushCallback[] | null = null;

  // insertion
  bfi: OnFlushCallback[] | null = null;
  afi: OnFlushCallback[] | null = null;
  bfai: OnFlushCallback[] | null = null;
  afai: OnFlushCallback[] | null = null;

  // layout
  bfl: OnFlushCallback[] | null = null;
  afl: OnFlushCallback[] | null = null;
  bfal: OnFlushCallback[] | null = null;
  afal: OnFlushCallback[] | null = null;

  /* lifecycle hook */
  bc: Function[] | null = null;
  c: Function[] | null = null;
  bm: Function[] | null = null;
  m: Function[] | null = null;
  bu: Function[] | null = null;
  u: Function[] | null = null;
  um: Function[] | null = null;
  bum: Function[] | null = null;
  da: Function[] | null = null;
  a: Function[] | null = null;
  rtg: Function[] | null = null;
  rtc: Function[] | null = null;
  ec: Function[] | null = null;
  sp: Function[] | null = null;

  appContext = {
    config: {},
  };
  #renderEffect: ReactiveEffect;
  #shouldGenerateTemplate = true;
  #renderingScheduled = false;
  #executed = false;
  #nbExecution = 0;
  #mounted = false;
  #updated = false;
  #children: () => React.ReactNode = () => null;
  #template: React.ReactNode = null;
  #plugins: Map<BridgePluginClass, BridgePlugin> | null = null;

  constructor() {
    this.#parent = getCurrentInstance();
    this.#renderEffect = new ReactiveEffect(() => {
      this.#updated = true;
      return this.#children();
    });
    this.#renderEffect.scheduler = () => {
      this.triggerRendering();
      this.#shouldGenerateTemplate = true;
    };
  }

  get parent() {
    return this.#parent;
  }
  init() {
    this.#nbExecution++;
    this.#isRunning = true;
    this.#scope.on();
  }
  get isRunning() {
    return this.#isRunning;
  }

  setPlugin(key: BridgePluginClass, plugin: BridgePlugin) {
    const plugins = this.#plugins || new Map<BridgePluginClass, BridgePlugin>();
    plugins.set(key, plugin);
    this.#plugins = plugins;
  }

  getPlugin<T extends BridgePluginClass>(key: T): InstanceType<T> | undefined {
    return this.#plugins?.get(key) as InstanceType<T>;
  }

  set children(children: () => React.ReactNode) {
    this.#children = children;
  }

  setupState() {
    const [s, setState] = useState(true);

    this.#renderTrigger = () => {
      setState(!s);
      this.#renderingScheduled = true;
    };
  }

  triggerRendering() {
    if (!this.#isRunning && !this.#renderingScheduled) {
      switchToManual();
      this.#renderTrigger();
    }
  }

  invalidateChildren() {
    this.#shouldGenerateTemplate = true;
  }

  render() {
    if (this.#shouldGenerateTemplate) {
      this.#template = this.#renderEffect.run();
    }
    const result = this.#template;
    this.#shouldGenerateTemplate = false;
    this.#renderingScheduled = false;
    return result;
  }

  #pendingPreEffects: number[] = [];
  #pendingPostEffects: number[] = [];
  #pendingLayoutEffects: number[] = [];
  #pendingInsertionEffects: number[] = [];
  queueEffect(flush: FlushType, index: number) {
    switch (flush) {
      case 'pre':
        this.#pendingPreEffects.push(index);
        break;
      case 'post':
        this.#pendingPostEffects.push(index);
        break;
      case 'insertion':
        this.#pendingInsertionEffects.push(index);
        break;
      case 'layout':
        this.#pendingLayoutEffects.push(index);
        break;
    }
  }

  isMounted() {
    return this.#mounted;
  }

  #currentPosition = 0;
  getEffectPosition() {
    return this.#currentPosition++;
  }

  computeHooks(type: LifecycleHooks) {
    const hooks = this[type];
    if (!hooks) return;
    for (const hook of hooks) hook();
  }
  computeListeners(type: EventType, event: Partial<Event> = {}) {
    const listeners = this[type];
    if (!listeners) return;
    event.type = type;
    for (const listener of listeners) listener(event);
  }

  resetPendingQueues() {
    this.#pendingPreEffects.length = 0;
    this.#pendingInsertionEffects.length = 0;
    this.#pendingLayoutEffects.length = 0;
    this.#pendingPostEffects.length = 0;
  }

  addEventListener(type: EventType, listener: OnFlushCallback) {
    const listeners: any[] = this[type] || [];
    listeners.push(listener);
    this[type] = listeners;
  }

  flushPreUntil(index: number) {
    const job = getJobAt(index);
    this.computeListeners(Events.BEFORE_FLUSHING_PRE_EFFECT, { job, index });
    flushJobsUntil(index);
    this.computeListeners(Events.AFTER_FLUSHING_PRE_EFFECT, { job, index });
  }

  hasPendingPreEffects() {
    return !!this.#pendingPreEffects.length;
  }

  flushPreEffects() {
    this.computeListeners(Events.BEFORE_FLUSHING_ALL_PRE_EFFECT);
    for (const index of this.#pendingPreEffects) {
      this.flushPreUntil(index);
    }
    this.#pendingPreEffects.length = 0;

    this.computeListeners(Events.AFTER_FLUSHING_ALL_PRE_EFFECT);
  }

  runEffects() {
    if (this.#executed && this.#shouldGenerateTemplate) {
      this.computeHooks(LifecycleHooks.BEFORE_UPDATE);
    }

    this.flushPreEffects();

    if (!this.#executed) {
      this.computeHooks(LifecycleHooks.BEFORE_MOUNT);
      this[LifecycleHooks.BEFORE_MOUNT] = null;
    }
    useInsertionEffect(() => {
      this.computeListeners(Events.BEFORE_FLUSHING_ALL_INSERTION_EFFECT);
      for (const index of this.#pendingInsertionEffects) {
        const job = getJobAt(index);
        this.computeListeners(Events.BEFORE_FLUSHING_INSERTION_EFFECT, { job, index });
        flushPostJobsUntil(index);
        this.computeListeners(Events.AFTER_FLUSHING_INSERTION_EFFECT, { job, index });
      }
      this.computeListeners(Events.AFTER_FLUSHING_ALL_INSERTION_EFFECT);
    });

    useLayoutEffect(() => {
      this.computeListeners(Events.BEFORE_FLUSHING_ALL_LAYOUT_EFFECT);
      for (const index of this.#pendingLayoutEffects) {
        const job = getJobAt(index);
        this.computeListeners(Events.BEFORE_FLUSHING_LAYOUT_EFFECT, { job, index });
        flushPostJobsUntil(index);
        this.computeListeners(Events.AFTER_FLUSHING_LAYOUT_EFFECT, { job, index });
      }
      this.computeListeners(Events.AFTER_FLUSHING_ALL_LAYOUT_EFFECT);
    });

    if (this[LifecycleHooks.MOUNTED]) {
      useEffect(() => {
        if (!this.#executed) {
          this.computeHooks(LifecycleHooks.MOUNTED);
          this[LifecycleHooks.MOUNTED] = null;
        }
      }, []);
    }

    if (this[LifecycleHooks.UPDATED]) {
      useEffect(() => {
        if (this.#executed && this.#updated) {
          this.computeHooks(LifecycleHooks.UPDATED);
        }
      });
    }

    useEffect(() => {
      this.computeListeners(Events.BEFORE_FLUSHING_ALL_POST_EFFECT);
      for (const index of this.#pendingPostEffects) {
        this.computeListeners(Events.BEFORE_FLUSHING_POST_EFFECT);
        flushPostJobsUntil(index);
        this.computeListeners(Events.AFTER_FLUSHING_POST_EFFECT);
      }
      this.computeListeners(Events.AFTER_FLUSHING_ALL_POST_EFFECT);

      this.resetPendingQueues();
      this.#executed = true;
      this.#updated = false;
      this.#isRunning = false;
      this.#scope.off();
      switchToAuto();
    });

    // on unmount effects
    useEffect(() => {
      this.#scope.resume();
      return () => {
        this.computeHooks(LifecycleHooks.UNMOUNTED);
        this.#scope.pause();
      };
    }, []);
  }

  get id() {
    return this.#id;
  }

  get scope() {
    return this.#scope;
  }

  isExecuted() {
    return this.#executed;
  }

  executed() {
    this.#executed = true;
  }

  get nbExecution() {
    return this.#nbExecution;
  }

  defineProps(keys: string[]) {
    if (!isArray(keys)) {
      warn('Wrong type passed, the keys value must be an array of string');
      return;
    }
    this.#staticProps = true;
    this.#propsKeys = keys;
  }

  trackPropsDynamically<T extends Record<string, any>>(props: T) {
    for (const key of Object.keys(props)) {
      this.#props[key] = props[key] as any;
    }

    return this.#props;
  }

  trackPropsStatically<T extends Record<string, any>>(props: T) {
    const keys = this.#propsKeys;

    for (const key of keys) {
      this.#props[key] = props[key];
    }

    return this.#props;
  }

  trackProps<T extends Record<string, any>>(props: T) {
    let result;

    if (this.#staticProps) result = this.trackPropsStatically(props);
    else result = this.trackPropsDynamically(props);

    return result;
  }
}

export default Context;
