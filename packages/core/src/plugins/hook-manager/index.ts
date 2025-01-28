import Context, { Events, isFastRefresh } from '../../context';
import React, { useState } from 'react';
import { NOOP, isFunction, isObject } from '#vue-internals/shared/general';
import { ReactiveEffect } from '#vue-internals/reactivity/effect';
import { getCurrentInstance, type ComponentInternalInstance } from '../../index';
import HookCallableSignal from './hook-callable-signal';
import { mustBeUnisonComponent } from '../../utils';
import { UnisonPlugin } from '../index';

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

export abstract class BaseSignal<T> {
  abstract trigger(): void;
}

type BaseSignalConstructor<T> = new (...args: any[]) => BaseSignal<T>;
interface HookManagerOptions<T extends BaseSignalConstructor<any>> {
  signalClass: T;
  unsignal: (signal: any) => any;
}

export class HookManager implements UnisonPlugin {
  #store: any[] = [];
  #storeCursor = 0;
  #hooks: any[] = [];
  #hookKeys: string[][] = [];
  #hookValues: any[][] = [];
  #hookSignals: (BaseSignal<any> | HookCallableSignal<any, any>)[][] = [];
  #hookEffect = new ReactiveEffect(NOOP);
  #signalClass: BaseSignalConstructor<any>;
  #unsignal: (signal: any) => any;
  #i = 0;
  static options: HookManagerOptions<any>;

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

  onInstanceCreated(instance: ComponentInternalInstance): void {
    this.#hookEffect.scheduler = () => instance.triggerRendering();

    instance.addEventListener(Events.BEFORE_FLUSHING_PRE_EFFECT, ({ job }) => {
      if (!instance.isExecuted() || isFastRefresh()) return;
      if (job) {
        const position = job.position || 0;
        while (this.#i < position) {
          this.processHook(this.#hooks[this.#i]);
          this.#i++;
        }
      }
    });

    instance.addEventListener(Events.AFTER_FLUSHING_ALL_PRE_EFFECT, () => {
      if (!instance.isExecuted() || isFastRefresh()) return;
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
  reset() {
    this.#hookKeys.length = 0;
    this.#hookSignals.length = 0;
    this.#hookValues.length = 0;
    this.#hooks.length = 0;
    this.#hookEffect = new ReactiveEffect(NOOP);
  }
  onInstanceFastRefresh(instance: ComponentInternalInstance): void {
    this.reset();
  }
  onInstanceDisposed(): void {}

  getValueAt(index: number) {
    return this.#store[index];
  }

  addToStore(value: any) {
    this.#store[this.#storeCursor] = value;
    const index = this.#storeCursor;

    this.#storeCursor++;

    return index;
  }

  setStoreValueAt(index: number, value: any) {
    this.#store[index] = value;
  }

  get store() {
    return this.#store;
  }

  getStoreNextIndex() {
    return this.#storeCursor++;
  }

  processHook(hook: any) {
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

  trackState<T>(hookIndex: number, value: T) {
    if (isFunction(value)) {
      const valueIndex = this.addToHookStore(hookIndex, value);
      const signal = new HookCallableSignal<any[], any>(this, hookIndex, valueIndex);
      this.#hookSignals[hookIndex].push(signal);
      return (...args: any[]) => signal.call(...args);
    }
    const Signal = this.#signalClass;
    const valueIndex = this.addToHookStore(hookIndex, value);
    const ref = new Signal(this, hookIndex, valueIndex);

    this.#hookSignals[hookIndex].push(ref);

    return ref;
  }

  trackStates<T extends object>(hookIndex: number, values: T) {
    if (Array.isArray(values)) {
      const result: any[] = [];
      for (const value of values) {
        result.push(this.trackState(hookIndex, value));
      }
      return result;
    }

    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(values)) {
      result[key] = this.trackState(hookIndex, value);
    }

    return result;
  }

  createTargets(paths: any) {
    return [];
  }

  addToHookStore(hookIndex: number, value: any) {
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

  registerHook(params: HookOptions) {
    this.#hooks[params.index] = params;
  }

  getHookValueAt(hookIndex: number, valueIndex: number) {
    return this.#hookValues[hookIndex][valueIndex];
  }
}

export function toUnisonHook<T extends ReactHook>(hook: T, options: UnisonHookOptions = {}) {
  return (...params: any[]) => {
    mustBeUnisonComponent();

    const instance = getCurrentInstance();

    const hookManager = instance?.getPlugin(HookManager);
    if (!hookManager) {
      if (__DEV__) {
        throw new Error('HookManager not found');
      } else {
        return;
      }
    }
    const index = hookManager.addHookStore();

    const args = params !== undefined ? params : [];
    hookManager.hookEffect.fn = () => hook(...args.map(hookManager.unsignal));
    const value = hookManager.hookEffect.run() as ReturnType<typeof hook>;

    if (isObject(value) && !options.shallow) {
      const states = hookManager.trackStates(index, value);
      const paths = isFunction(options.paths) ? options.paths(args) : options.paths;
      const targets = hookManager.createTargets(paths);
      hookManager.registerHook({ options: { paths, targets }, hook, index, params: args, shallow: false });

      return states;
    }
    const state = hookManager.trackState(index, value);

    hookManager.registerHook({ hook, index, params: args, shallow: options.shallow });

    return state;
  };
}

export interface UnisonHookOptions {
  paths?: any | ((...args: any[]) => any);
  shallow?: boolean;
}
type ReactHook = (...args: any[]) => any;

export interface HookOptions {
  hook: ReactHook;
  index: number;
  params: any;
  options?: any;
  position?: number;
  shallow?: boolean;
  paths?: Function | any;
}
