/** @import { BridgePlugin, BridgePluginClass } from './plugins/index' */
/** @import { WatchEffectOptions } from '#vue-internals/runtime-core/apiWatch' */
/** @import { ComponentInternalInstance } from './index' */
/** @import { SchedulerJob } from '#vue-internals/runtime-core/scheduler' */
/** @import { Event, EventType } from './types.d.ts' */

import { useEffect, useInsertionEffect, useLayoutEffect, useState } from 'react';
import { isArray, NOOP } from '#vue-internals/shared/index';
import {
  flushJobsUntil,
  flushPostJobsUntil,
  getJobAt,
  switchToAuto,
  switchToManual,
} from '#vue-internals/runtime-core/scheduler';
import { EffectScope, shallowReactive, ReactiveEffect } from '#vue-internals/reactivity/index';
import { warn } from '#vue-internals/runtime-core/warning';

import { LifecycleHooks } from '#vue-internals/runtime-core/enums';
import { getCurrentInstance } from './index';

let id = 0;

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
};

/** @typedef {(event: Partial<Event>) => void} OnFlushCallback */
/** @typedef {WatchEffectOptions['flush']} FlushType */

class Context {
  /**
   * @private
   * @type {number}
   * Unique identifier for the instance.
   */
  #id = id++;

  /**
   * @private
   * @type {ComponentInternalInstance | null}
   * Reference to the parent component instance.
   */
  #parent = null;

  /**
   * @private
   * @type {() => void}
   * Function to trigger rendering, initialized to a no-op or warning function in development.
   */
  #renderTrigger = !!(process.env.NODE_ENV !== 'production')
    ? () => {
      warn("Can't trigger a new rendering, the state is not setup properly");
    }
    : NOOP;

  /**
   * @private
   * @type {boolean}
   * Indicates whether the instance is currently running.
   */
  #isRunning = false;

  /**
   * @private
   * @type {string[]}
   * Keys for props, used for static prop tracking.
   */
  #propsKeys = [];

  /**
   * @private
   * @type {boolean}
   * Flag indicating whether props are being tracked statically.
   */
  #staticProps = false;

  /**
   * @private
   * @type {EffectScope}
   * Scope for managing reactive effects.
   */
  #scope = new EffectScope(true);

  /**
   * @private
   * @type {Record<string, any>}
   * Reactive object for managing props.
   */
  #props = shallowReactive({});

  /**
   * Event listeners grouped by type and phase.
   * @type {Object<string, OnFlushCallback[] | null>}
   */
  bfpre = null;
  afpre = null;
  bfapre = null;
  afapre = null;
  bfpost = null;
  afpost = null;
  bfapost = null;
  afapost = null;
  bfi = null;
  afi = null;
  bfai = null;
  afai = null;
  bfl = null;
  afl = null;
  bfal = null;
  afal = null;

  /**
   * Lifecycle hooks grouped by phase.
   * @type {Object<string, Function[] | null>}
   */
  bc = null;
  c = null;
  bm = null;
  m = null;
  bu = null;
  u = null;
  um = null;
  bum = null;
  da = null;
  a = null;
  rtg = null;
  rtc = null;
  ec = null;
  sp = null;

  /**
   * Application context configuration.
   * @type {Object<string, any>}
   */
  appContext = {
    config: {},
  };

  /**
   * @private
   * @type {ReactiveEffect}
   * Effect for rendering updates.
   */
  #renderEffect;

  /**
   * @private
   * @type {boolean}
   * Flag indicating whether the template should be regenerated.
   */
  #shouldGenerateTemplate = true;

  /**
   * @private
   * @type {boolean}
   * Flag indicating whether rendering is scheduled.
   */
  #renderingScheduled = false;

  /**
   * @private
   * @type {boolean}
   * Indicates if the instance has been executed at least once.
   */
  #executed = false;

  /**
   * @private
   * @type {number}
   * Tracks the number of executions of the instance.
   */
  #nbExecution = 0;

  /**
   * @private
   * @type {boolean}
   * Indicates if the instance is mounted.
   */
  #mounted = false;

  /**
   * @private
   * @type {boolean}
   * Indicates if the instance has been updated.
   */
  #updated = false;

  /**
   * @private
   * @type {() => React.ReactNode}
   * Function to generate children nodes.
   */
  #children = () => null;

  /**
   * @private
   * @type {React.ReactNode}
   * The rendered template.
   */
  #template = null;

  /**
   * @private
   * @type {Map<BridgePluginClass, BridgePlugin> | null}
   * Registry of plugins for the bridge.
   */
  #plugins = null;

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

  /**
   * Retrieves the parent component instance.
   * 
   * @returns {ComponentInternalInstance | null}
   */
  get parent() {
    return this.#parent;
  }

  /**
   * Initializes the instance, incrementing execution count and enabling the effect scope.
   * 
   * @returns {void}
   */
  init() {
    this.#nbExecution++;
    this.#isRunning = true;
    this.#scope.on();
    if (this.isFastRefresh() && !window.__BRIDGE_REFRESH__.root) {
      window.__BRIDGE_REFRESH__.root = this;
    }
  }
  /**
   * Indicates whether the instance is running.
   * 
   * @returns {boolean}
   */
  get isRunning() {
    return this.#isRunning;
  }

  /**
   * Sets a plugin in the internal plugin registry.
   * 
   * @param {BridgePluginClass} key - The class of the plugin.
   * @param {BridgePlugin} plugin - The plugin instance to set.
   * @returns {void}
   */
  setPlugin(key, plugin) {
    const plugins = this.#plugins || new Map();
    plugins.set(key, plugin);
    this.#plugins = plugins;
  }

  /**
   * Retrieves a plugin from the internal plugin registry.
   * 
   * @template T
   * @param {T} key - The class of the plugin.
   * @returns {InstanceType<T> | undefined} - The plugin instance, or undefined if not found.
   */
  getPlugin(key) {
    return this.#plugins?.get(key);
  }

  /**
   * Sets the children rendering function.
   * 
   * @param {() => React.ReactNode} children - The function to render children.
   * @returns {void}
   */
  set children(children) {
    this.#children = children;
  }

  /**
   * Initializes the state and sets up the rendering trigger.
   * 
   * @returns {void}
   */
  setupState() {
    const [s, setState] = useState(true);

    this.#renderTrigger = () => {
      setState(!s);
      this.#renderingScheduled = true;
    };
  }

  /**
   * Triggers a rendering process if not already running or scheduled.
   * 
   * @returns {void}
   */
  triggerRendering() {
    if (!this.#isRunning && !this.#renderingScheduled) {
      switchToManual();
      this.#renderTrigger();
    }
  }

  /**
   * Marks the children for regeneration.
   * 
   * @returns {void}
   */
  invalidateChildren() {
    this.#shouldGenerateTemplate = true;
  }

  /**
   * Renders the component, regenerating the template if necessary.
   * 
   * @returns {React.ReactNode} - The rendered template.
   */
  render() {
    if (this.#shouldGenerateTemplate) {
      this.#template = this.#renderEffect.run();
    }
    const result = this.#template;
    this.#shouldGenerateTemplate = false;
    this.#renderingScheduled = false;
    return result;
  }

  #pendingPreEffects = [];
  #pendingPostEffects = [];
  #pendingLayoutEffects = [];
  #pendingInsertionEffects = [];

  /**
   * Queues an effect index based on the flush type.
   * 
   * @param {"pre" | "post" | "layout" | "insertion"} flush - The type of flush effect.
   * @param {number} index - The index of the effect to queue.
   */
  queueEffect(flush, index) {
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

  /**
   * Checks if the instance is mounted.
   * 
   * @returns {boolean} - True if mounted, otherwise false.
   */
  isMounted() {
    return this.#mounted;
  }

  /**
   * @private
   * @type {number}
   * Tracks the current effect position.
   */
  #currentPosition = 0;

  /**
   * Gets the current effect position and increments it.
   * 
   * @returns {number} - The current effect position.
   */
  getEffectPosition() {
    return this.#currentPosition++;
  }

  /**
   * Computes and executes lifecycle hooks of a specified type.
   * 
   * @param {FlushType} type - The type of lifecycle hooks.
   * @returns {void}
   */
  computeHooks(type) {
    const hooks = this[type];
    if (!hooks) return;
    for (const hook of hooks) hook();
  }

  /**
   * Computes and executes event listeners of a specified type.
   * 
   * @param {EventType} type - The type of event.
   * @param {Partial<Event>} [event={}] - The event object to pass to listeners.
   * @returns {void}
   */
  computeListeners(type, event = {}) {
    const listeners = this[type];
    if (!listeners) return;
    event.type = type;
    for (const listener of listeners) listener(event);
  }


  /**
   * Resets all pending effect queues.
   * 
   * @returns {void}
   */
  resetPendingQueues() {
    this.#pendingPreEffects.length = 0;
    this.#pendingInsertionEffects.length = 0;
    this.#pendingLayoutEffects.length = 0;
    this.#pendingPostEffects.length = 0;
  }

  /**
   * Adds an event listener for a specific event type.
   * 
   * @param {EventType} type - The type of event.
   * @param {OnFlushCallback} listener - The callback function to invoke when the event is triggered.
   * @returns {void}
   */
  addEventListener(type, listener) {
    const listeners = this[type] || [];
    listeners.push(listener);
    this[type] = listeners;
  }

  /**
   * Flushes pre-effects up to the specified index.
   * 
   * @param {number} index - The index up to which pre-effects should be flushed.
   * @returns {void}
   */
  flushPreUntil(index) {
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
      if (this.isFastRefresh() && window.__BRIDGE_REFRESH__.root === this) {
        window.__BRIDGE_REFRESH__ = undefined;
      }
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

  isFastRefresh() {
    return !!(typeof window !== 'undefined' && window.__BRIDGE_REFRESH__);
  }

  executed() {
    this.#executed = true;
  }

  get nbExecution() {
    return this.#nbExecution;
  }

  /**
  * Defines the keys to be used as static props.
  * 
  * @param {string[]} keys - An array of strings representing the keys to define.
  * @returns {void}
  */
  defineProps(keys) {
    if (!isArray(keys)) {
      warn('Wrong type passed, the keys value must be an array of string');
      return;
    }
    this.#staticProps = true;
    this.#propsKeys = keys;
  }

  /**
   * Tracks props dynamically, adding all keys and their values from the given props object.
   * 
   * @template T
   * @param {T} props - The props object to track dynamically.
   * @returns {Record<string, any>} - The updated props object.
   */
  trackPropsDynamically(props) {
    for (const key of Object.keys(props)) {
      this.#props[key] = props[key];
    }

    return this.#props;
  }

  /**
   * Tracks props statically, adding only predefined keys and their values from the given props object.
   * 
   * @template T
   * @param {T} props - The props object to track statically.
   * @returns {Record<string, any>} - The updated props object.
   */
  trackPropsStatically(props) {
    const keys = this.#propsKeys;

    for (const key of keys) {
      this.#props[key] = props[key];
    }

    return this.#props;
  }

  /**
   * Tracks props based on the current tracking mode (static or dynamic).
   * 
   * @template T
   * @param {T} props - The props object to track.
   * @returns {Record<string, any>} - The updated props object.
   */
  trackProps(props) {
    let result;

    if (this.#staticProps) result = this.trackPropsStatically(props);
    else result = this.trackPropsDynamically(props);

    return result;
  }

}

export default Context;
