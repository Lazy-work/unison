import {
  ARRAY_ITERATE_KEY,
  ComponentInternalInstance,
  Dep,
  isFastRefresh,
  ITERATE_KEY,
  MAP_KEY_ITERATE_KEY,
  ReactiveEffect,
  type UnisonPlugin,
} from '@unisonjs/core';
import { isFunction, isObject, NOOP } from '@vue/shared';
import { isRef, isShallow, shallowRef, toRaw, unref } from '../reactivity';
import { Events } from '@unisonjs/core';
import { getAccessor } from './utils';
import {
  checkCompatibility,
  DetectedType,
  detectType,
  getDefaultTracking,
  getFallbackConfig,
  getTrackingType,
  isTrackSelf,
  t,
} from './tracking-types';
import type { ReactHook, TrackingConfig, TrackingConfigInput } from './tracking-types';
import { ref } from './ref';
import { reactive, shallowReactive } from './reactive';

interface HookOptions {
  hook: ReactHook;
  params: any;
  tracking?: TrackingConfigInput;
}

interface HookRegistration extends HookOptions {
  index: number;
}

export class HookManager implements UnisonPlugin {
  #currentValues: any[] = [];
  #previousValues: any[] = [];
  #trackingConfigs: TrackingConfig[] = [];
  #storeCursor = 0;
  #hooks: HookRegistration[] = [];
  #signals: any[] = [];
  #effect = new ReactiveEffect<any>(NOOP);
  #scheduler = NOOP;
  #trackedPaths: Map<string, Map<string, unknown[]>>[] = [];
  #i = 0;

  constructor() {
    this.#effect.scheduler = () => this.#scheduler();
  }

  get hookEffect() {
    return this.#effect;
  }

  trackPath(hookIndex: number, rootKey: string, basePath: string, key: unknown) {
    let registar = this.#trackedPaths[hookIndex];
    let trackedPaths = registar.get(rootKey);
    if (!trackedPaths) registar.set(rootKey, (trackedPaths = new Map()));
    let trackedKeys = trackedPaths.get(basePath);
    if (!trackedKeys) trackedPaths.set(basePath, (trackedKeys = []));
    trackedKeys.push(key);
  }
  #targetMaps: Map<string, Map<string, Map<any, Dep>>>[] = [];

  createTargetDeps(hookIndex: number, rootKey: string, targetPath: string): Map<string, Dep> {
    let rootMaps = this.#targetMaps[hookIndex];
    if (!rootMaps) {
      this.#targetMaps[hookIndex] = rootMaps = new Map();
    }

    let rootMap = rootMaps.get(rootKey);
    if (!rootMap) {
      rootMaps.set(rootKey, (rootMap = new Map()));
    }

    let depsMap;
    rootMap.set(targetPath, (depsMap = new Map()));

    return depsMap;
  }

  getTargetDeps(hookIndex: any, rootKey: string, targetPath: string) {
    const rootMaps = this.#targetMaps[hookIndex];
    if (!rootMaps) return;

    const rootMap = rootMaps.get(rootKey);
    if (!rootMap) return;

    const depsMap = rootMap.get(targetPath);

    return depsMap;
  }

  onInstanceCreated(instance: ComponentInternalInstance): void {
    this.#scheduler = () => instance.triggerRendering();

    instance.addEventListener(Events.BEFORE_FLUSHING_PRE_EFFECT, ({ job }) => {
      if (!instance.isExecuted() || isFastRefresh()) return;
      if (job) {
        const position = job.position || 0;
        while (this.#i < position) {
          this.processHookAt(this.#i);
          this.#i++;
        }
      }
    });

    instance.addEventListener(Events.AFTER_FLUSHING_ALL_PRE_EFFECT, () => {
      if (!instance.isExecuted() || isFastRefresh()) return;
      while (this.#i < this.#hooks.length && !instance.hasPendingPreEffects()) {
        this.processHookAt(this.#i);
        this.#i++;
      }

      if (instance.hasPendingPreEffects()) {
        instance.flushPreEffects();
      }

      this.#i = 0;
    });
  }
  reset() {
    this.#signals.length = 0;
    this.#hooks.length = 0;
    this.#effect = new ReactiveEffect(NOOP);
  }
  onInstanceFastRefresh(instance: ComponentInternalInstance): void {
    this.reset();
  }
  onInstanceDisposed(): void {}

  getHookResultAt(index: number) {
    return this.#currentValues[index];
  }

  getHookPreviousResultAt(index: number) {
    return this.#previousValues[index];
  }

  addToStore(value: any) {
    this.#currentValues[this.#storeCursor] = value;
    const index = this.#storeCursor;

    this.#storeCursor++;

    return index;
  }

  setStoreValueAt(index: number, value: any) {
    this.#currentValues[index] = value;
  }

  get store() {
    return this.#currentValues;
  }

  getStoreNextIndex() {
    return this.#storeCursor++;
  }

  getTrackingConfigAt(hookIndex: number) {
    return this.#trackingConfigs[hookIndex];
  }

  processHookAt(index: number) {
    const hook = this.#hooks[index];
    if (!hook) return;

    const args = isFunction(hook.params) ? hook.params() : (hook.params ?? []);
    this.#effect.fn = () => hook.hook(...args.map((arg: any) => toRaw(unref(arg))));
    const newResult = this.#effect.run();

    this.#previousValues[hook.index] = this.#currentValues[hook.index];
    this.#currentValues[hook.index] = newResult;

    const actualType = detectType(newResult);

    const tracking = this.#resolveTracking(hook, args, actualType);

    this.#trackingConfigs[hook.index] = tracking;

    const signal = this.#applyTracking(hook.index, newResult, tracking, actualType);

    this.#updateTrackedPaths(hook.index, newResult, signal, tracking);

    return signal;
  }

  #resolveTracking(hook: HookRegistration, params: any[], actualType: DetectedType): TrackingConfig {
    let specified: TrackingConfig | Record<string, any> | undefined;

    if (isFunction(hook.tracking)) {
      try {
        specified = hook.tracking(...params);
      } catch (error) {
        if (__DEV__) {
          console.error('[UnisonJS] Tracking function threw error:', error);
        }
        specified = undefined;
      }
    } else {
      specified = hook.tracking as TrackingConfig | Record<string, any> | undefined;
    }

    if (!specified) {
      return getDefaultTracking(actualType);
    }

    // Check if it's a root-level tracking config
    const trackingType = getTrackingType(specified);
    if (trackingType) {
      const config = specified as TrackingConfig;

      const compatible = checkCompatibility(trackingType, actualType);

      if (compatible) {
        return config;
      }

      const fallback = getFallbackConfig(trackingType, actualType);

      if (__DEV__) {
        const hookName = hook.hook.name || 'anonymous';
        console.warn(
          `[UnisonJS] Type incompatibility in ${hookName}:\n` +
            `  Specified: ${trackingType}\n` +
            `  Actual: ${actualType}\n` +
            `  Falling back to: ${getTrackingType(fallback)}\n` +
            `  Suggestion: Use t.ref() or t.shallowRef() for flexible types.`,
        );
      }

      return fallback;
    }

    return t.toRefs(specified);
  }

  #applyTracking(hookIndex: number, result: any, tracking: TrackingConfig, actualType: DetectedType): any {
    const existingSignal = this.#signals[hookIndex];

    const trackingType = getTrackingType(tracking);
    switch (trackingType) {
      case 'ref':
        return this.#applyRef(hookIndex, result, existingSignal);

      case 'shallowRef':
        return this.#applyShallowRef(hookIndex, result, existingSignal);

      case 'toRefs':
      case 'refs':
        return this.#applyToRefs(hookIndex, result, tracking, existingSignal);
      case 'reactive':
        return this.#applyReactive(hookIndex, existingSignal);
      case 'object':
        return this.#applyObject(hookIndex, existingSignal);
      case 'shallowReactive':
        return this.#applyShallowReactive(hookIndex, existingSignal);

      case 'shallowObject':
        return this.#applyShallowObject(hookIndex, existingSignal);

      case 'function':
        return this.#applyFunction(hookIndex, result);

      default:
        if (__DEV__) {
          console.warn(`[UnisonJS] Unknown tracking type: ${tracking}`);
        }
        return this.#applyRef(hookIndex, result, existingSignal);
    }
  }

  #applyRef(hookIndex: number, result: any, existingSignal: any): any {
    if (isObject(result)) {
      if (!existingSignal) {
        this.#signals[hookIndex] = ref(
          {
            hookIndex,
            hookManager: this,
          },
          result,
        );
      }
    } else {
      if (!existingSignal) {
        this.#signals[hookIndex] = ref(
          {
            hookIndex,
            hookManager: this,
          },
          result,
        );
      } else {
        existingSignal.value = result;
      }
    }

    return this.#signals[hookIndex];
  }

  #applyShallowRef(hookIndex: number, result: any, existingSignal: any): any {
    if (!existingSignal) {
      this.#signals[hookIndex] = shallowRef(result);
    } else {
      existingSignal.value = result;
    }

    return this.#signals[hookIndex];
  }

  #applyReactive(hookIndex: number, existingSignal: any): any {
    if (!existingSignal) {
      this.#signals[hookIndex] = reactive({
        hookIndex,
        hookManager: this,
      });
    }

    return this.#signals[hookIndex];
  }

  #applyShallowReactive(hookIndex: number, existingSignal: any): any {
    if (!existingSignal) {
      this.#signals[hookIndex] = shallowReactive({
        hookIndex,
        hookManager: this,
      });
    }
    // Note: reactive objects are updated in updateTrackedPaths
    return this.#signals[hookIndex];
  }

  #applyToRefs(
    hookIndex: number,
    result: any,
    tracking: Record<string, TrackingConfig> | undefined,
    existingSignal: any,
  ): any {
    if (!isObject(result)) {
      if (__DEV__) {
        console.warn('[UnisonJS] toRefs() applied to non-object, using ref instead');
      }
      return this.#applyRef(hookIndex, result, existingSignal);
    }

    let signal = existingSignal;

    if (!signal) {
      signal = this.#signals[hookIndex] = {};

      for (const [key, value] of Object.entries(result)) {
        const fieldTracking = tracking?.[key] || this.#inferFieldTracking(value);
        signal[key] = this.#createFieldSignal(hookIndex, key, value, fieldTracking);
      }
    } else {
      // Update existing signals
      for (const [key, value] of Object.entries(result)) {
        if (signal[key]) {
          this.#updateFieldSignal({ signal: signal[key], value, hookIndex, tracking: tracking?.[key] });
        } else {
          // New field appeared
          const fieldTracking = tracking?.[key] || this.#inferFieldTracking(value);
          signal[key] = this.#createFieldSignal(hookIndex, key, value, fieldTracking);
        }
      }
    }

    return signal;
  }

  #applyObject(hookIndex: number, existingSignal: any): any {
    return this.#applyReactive(hookIndex, existingSignal);
  }

  #applyShallowObject(hookIndex: number, existingSignal: any): any {
    return this.#applyShallowReactive(hookIndex, existingSignal);
  }

  #applyFunction(hookIndex: number, result: any): any {
    if (!isFunction(result)) {
      if (__DEV__) {
        console.warn('[UnisonJS] t.function() applied to non-function');
      }
      return this.#applyRef(hookIndex, result, this.#signals[hookIndex]);
    }

    // Return wrapper that always calls current value
    this.#signals[hookIndex] = result; // Store for reference

    const hookManager = this;
    return new Proxy((...args: any[]) => this.#currentValues[hookIndex]?.(...args), {
      get(_, internalKey) {
        const currentValue = hookManager.#currentValues[hookIndex];
        return Reflect.get(currentValue, internalKey);
      },
    });
  }

  #inferFieldTracking(value: any): TrackingConfig {
    if (isFunction(value)) {
      return t.function();
    }
    if (isObject(value)) {
      return t.reactive();
    }
    return t.ref();
  }

  #createFieldSignal(hookIndex: number, key: string, value: any, tracking: TrackingConfig): any {
    switch (getTrackingType(tracking)) {
      case 'function':
        const hookManager = this;
        return new Proxy((...args: any[]) => this.#currentValues[hookIndex][key](...args), {
          get(_, internalKey) {
            const currentValue = hookManager.#currentValues[hookIndex][key];
            return Reflect.get(currentValue, internalKey);
          },
        });

      case 'shallowRef':
      case 'shallow':
        return shallowRef(value);

      case 'object':
      case 'reactive': {
        const reactiveResult = reactive({
          hookIndex,
          hookManager: this,
          rootKey: key,
        });
        return shallowRef(reactiveResult);
      }

      case 'shallowObject':
      case 'shallowReactive': {
        const shallowResult = shallowReactive({
          hookIndex,
          hookManager: this,
          rootKey: key,
        });
        return shallowRef(shallowResult);
      }

      case 'ref':
      default:
        return ref(
          {
            hookIndex,
            hookManager: this,
            rootKey: key,
          },
          value,
        );
    }
  }

  #updateFieldSignal({
    signal,
    value,
    tracking,
    hookIndex,
  }: {
    signal: any;
    value: any;
    tracking?: TrackingConfig;
    hookIndex: number;
  }) {
    if (isRef(signal)) {
      const trackingType = getTrackingType(tracking);
      if ((!isObject(value) && !isFunction(value)) || trackingType === 'shallow') {
        signal.value = value;
      }

      if (isTrackSelf(tracking)) {
        if (!isShallow(signal)) signal.value = value;
        if (isShallow(signal) && !Object.is(toRaw(signal.value), value)) {
          if (trackingType === 'shallowObject' || trackingType === 'shallowReactive') {
            signal.value = shallowReactive({
              hookIndex,
              hookManager: this,
            });
          }

          if (trackingType === 'object' || trackingType === 'reactive') {
            signal.value = reactive({
              hookIndex,
              hookManager: this,
            });
          }
        }
      }
    }
  }

  #updateTrackedPaths(hookIndex: number, newResult: any, signal: any, tracking: TrackingConfig) {
    // if (!["object", "shallowObject", "reactive", "shallowReactive", "toRefs"].includes(tracking[TYPE])) return;

    for (const [rootKey, pathEntries] of this.#trackedPaths[hookIndex]) {
      const root = rootKey !== '' ? newResult[rootKey] : newResult;
      const rootFromSignal = this.#getRootFromSignal(signal, rootKey);

      for (const [basePath, keys] of pathEntries) {
        const accessor = getAccessor(basePath);

        const newTarget = accessor.getValue(root);
        const oldTarget = accessor.getValue(rootFromSignal);
        for (const key of keys) {
          this.#updateTarget(oldTarget, newTarget, key);
        }
      }
    }
  }

  #getRootFromSignal(signal: any, rootKey: string) {
    if (rootKey === '') {
      return isRef(signal) ? signal.value : signal;
    }

    return signal[rootKey]?.value ?? signal[rootKey];
  }

  #updateTarget(oldTarget: any, newTarget: any, key: any) {
    if (!oldTarget || !newTarget) return;

    switch (key) {
      case ITERATE_KEY: {
        const allKeys = new Set([...Object.keys(newTarget), ...Object.keys(oldTarget)]);

        for (const k of allKeys) {
          if (k in newTarget) {
            oldTarget[k] = newTarget[k];
          } else if (k in oldTarget) {
            delete oldTarget[k];
          }
        }
        break;
      }

      case ARRAY_ITERATE_KEY: {
        for (let i = 0; i < newTarget.length; i++) {
          oldTarget[i] = newTarget[i];
        }
        oldTarget.length = newTarget.length;
        break;
      }

      case MAP_KEY_ITERATE_KEY:
        // TODO: Handle Map iteration
        break;

      default:
        if (key in oldTarget && key in newTarget) {
          oldTarget[key] = newTarget[key];
        }
        break;
    }
  }
  registerHook(params: HookOptions) {
    const index = this.#hooks.length;
    this.#hooks.push({ ...params, index });
    this.#trackedPaths.push(new Map());

    return this.#hooks.length - 1;
  }
}
