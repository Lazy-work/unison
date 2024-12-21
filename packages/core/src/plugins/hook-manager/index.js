import React, { useState } from 'react';
import { Events } from '../../context.js';
import { NOOP, isFunction, isObject } from '#vue-internals/shared/general.js';
import { ReactiveEffect } from '#vue-internals/reactivity/effect.js';
import { getCurrentInstance } from '../../index.js';
import HookCallableSignal from './hook-callable-signal.js';
import { mustBeBridgeComponent } from '../../utils.js';

const nativeHooks = [
  React.useReducer,
  React.useEffect,
  React.useId,
  React.useLayoutEffect,
  React.useMemo,
  React.useCallback,
  React.useRef,
  React.useContext,
  React.useImperativeHandle,
  React.useDebugValue,
  React.useTransition,
  React.useDeferredValue,
];

export class HookManager {
  #store = [];
  #storeCursor = 0;
  #hooks = [];
  #hookKeys = [];
  #hookValues = [];
  #hookSignals = [];
  #hookEffect = new ReactiveEffect(NOOP);
  #signalClass;
  #unsignal;
  #i = 0;
  static options;

  constructor() {
    this.#signalClass = HookManager.options.signalClass;
    this.#unsignal = HookManager.options.unsignal;
  }

  get unsignal() {
    return this.#unsignal;
  }

  get hookEffect() {
    return this.#hookEffect;
  }

  onInstanceCreated(instance) {
    this.#hookEffect.scheduler = () => instance.triggerRendering();

    instance.addEventListener(Events.BEFORE_FLUSHING_PRE_EFFECT, ({ job }) => {
      if (!instance.isExecuted()) return;
      if (job) {
        const position = job.position || 0;
        while (this.#i < position) {
          this.processHook(this.#hooks[this.#i]);
          this.#i++;
        }
      }
    });

    instance.addEventListener(Events.AFTER_FLUSHING_ALL_PRE_EFFECT, () => {
      if (!instance.isExecuted()) return;
      while (this.#i < this.#hooks.length && !instance.hasPendingPreEffects()) {
        this.processHook(this.#hooks[this.#i]);
        this.#i++;
      }

      if (instance.hasPendingPreEffects()) {
        instance.flushPreEffects();
      }

      this.#i = 0;
    });
  }
  onInstanceDisposed() {}

  getValueAt(index) {
    return this.#store[index];
  }

  addToStore(value) {
    this.#store[this.#storeCursor] = value;
    const index = this.#storeCursor;

    this.#storeCursor++;

    return index;
  }

  setStoreValueAt(index, value) {
    this.#store[index] = value;
  }

  get store() {
    return this.#store;
  }

  getStoreNextIndex() {
    return this.#storeCursor++;
  }

  processHook(hook) {
    if (!hook) return;
    const args = isFunction(hook.params) ? hook.params() : hook.params !== undefined ? hook.params : [];
    this.#hookEffect.fn = () => hook.hook(...args.map(this.#unsignal));
    const result = this.#hookEffect.run();

    if (hook.hook === useState) {
      // ignore
    } else if (nativeHooks.includes(hook.hook)) {
      this.#store[hook.index] = result;
    } else {
      if (isObject(result) && !hook.shallow) {
        if (Array.isArray(result)) {
          for (let i = 0; i < result.length; i++) {
            this.#hookValues[hook.index][i] = result[i];
          }
        } else {
          const currentHookKeys = Object.keys(result);

          for (const key of currentHookKeys) {
            if (this.#hookKeys[hook.index].indexOf(key) === -1) this.#hookKeys[hook.index].push(key);
          }

          const keys = this.#hookKeys[hook.index];

          for (let i = 0; i < keys.length; i++) {
            if (this.#hookValues[hook.index][i] !== result[keys[i]]) {
              this.#hookValues[hook.index][i] = result[keys[i]];
              this.#hookSignals[hook.index][i].trigger();
            }
          }
        }
      } else {
        if (this.#hookValues[hook.index][0] !== result) {
          this.#hookValues[hook.index][0] = result;
          this.#hookSignals[hook.index][0].trigger();
        }
      }
    }
  }

  trackState(hookIndex, value) {
    if (isFunction(value)) {
      const valueIndex = this.addToHookStore(hookIndex, value);
      const signal = new HookCallableSignal(this, hookIndex, valueIndex);
      this.#hookSignals[hookIndex].push(signal);
      return (...args) => signal.call(...args);
    }
    const Signal = this.#signalClass;
    const valueIndex = this.addToHookStore(hookIndex, value);
    const ref = new Signal(this, hookIndex, valueIndex);

    this.#hookSignals[hookIndex].push(ref);

    return ref;
  }

  trackStates(hookIndex, values) {
    if (Array.isArray(values)) {
      const result = [];
      for (const value of values) {
        result.push(this.trackState(hookIndex, value));
      }
      return result;
    }

    const result = {};

    for (const [key, value] of Object.entries(values)) {
      result[key] = this.trackState(hookIndex, value);
    }

    return result;
  }

  createTargets(paths) {
    return [];
  }

  addToHookStore(hookIndex, value) {
    this.#hookValues[hookIndex].push(value);
    const index = this.#hookValues[hookIndex].length - 1;

    return index;
  }

  addHookStore() {
    this.#hookKeys.push([]);
    this.#hookValues.push([]);
    this.#hookSignals.push([]);

    return this.#hookValues.length - 1;
  }

  registerHook(params) {
    this.#hooks[params.index] = params;
  }

  getHookValueAt(hookIndex, valueIndex) {
    return this.#hookValues[hookIndex][valueIndex];
  }
}

export function toBridgeHook(hook = {}, options = {}) {
  return (...params) => {
    mustBeBridgeComponent();

    const instance = getCurrentInstance();

    const hookManager = instance?.getPlugin(HookManager);
    if (!hookManager) {
      if (!!(process.env.NODE_ENV !== 'production')) {
        throw new Error('HookManager not found');
      } else {
        return;
      }
    }
    const index = hookManager.addHookStore();

    const args = params !== undefined ? params : [];
    hookManager.hookEffect.fn = () => hook(...args.map(hookManager.unsignal));
    const value = hookManager.hookEffect.run();

    if (isObject(value)) {
      const states = hookManager.trackStates(index, value);
      const paths = isFunction(options.paths) ? options.paths(args) : options.paths;
      const targets = hookManager.createTargets(paths);
      hookManager.registerHook({ options: { paths, targets }, hook, index, params: args, shallow: false });

      return states;
    }
    const state = hookManager.trackState(index, value);

    hookManager.registerHook({ hook, index, params: args });

    return state;
  };
}
