import {
  activeSub,
  ARRAY_ITERATE_KEY,
  Dep,
  endBatch,
  globalVersion,
  ITERATE_KEY,
  MAP_KEY_ITERATE_KEY,
  shouldTrack,
  startBatch,
} from '@unisonjs/core';
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from '../reactivity/constants';
import { hasChanged, hasOwn, isArray, isIntegerKey, isMap, isObject, isSymbol } from '@vue/shared';
import { arrayInstrumentations } from './arrayInstrumentations';
import { buildPath, createProxy, getAccessor } from './utils';
import type { HookManager } from './hook-manager';
import { getTrackingType, isTrackSelf, TrackingConfig } from './tracking-types';

export interface ReactiveContextConfig {
  basePath?: string;
  hookManager: HookManager;
  rootKey?: string;
  trackSelf?: boolean;
  hookIndex: number;
  isShallow: boolean;
}


const TRACK = Symbol('track');
const TRIGGER = Symbol('trigger');

function get(target: any, key: any) {
  if (key === '') return target;

  return Reflect.get(target, key);
}

export function track(context: ReactiveContext, params: Parameters<ReactiveContext[typeof TRACK]>[0]) {
  context[TRACK](params);
}
export function trigger(context: ReactiveContext, params: Parameters<ReactiveContext[typeof TRIGGER]>[0]) {
  context[TRIGGER](params);
}

const builtInSymbols = new Set(
  /*@__PURE__*/
  Object.getOwnPropertyNames(Symbol)
    // ios10.x Object.getOwnPropertyNames(Symbol) can enumerate 'arguments' and 'caller'
    // but accessing them on Symbol leads to TypeError because Symbol is a strict mode
    // function
    .filter((key) => key !== 'arguments' && key !== 'caller')
    .map((key) => Symbol[key as keyof SymbolConstructor])
    .filter(isSymbol),
);

const handler: ProxyHandler<ReactiveContext> = {
  get(context, key) {
    if (key === TRACK || key === TRIGGER) {
      return Reflect.get(context, key).bind(context);
    }

    const target = context.getValue();
    const value = target[key];

    // if (key === ReactiveFlags.SKIP) return target[ReactiveFlags.SKIP]

    const isReadonly = false,
      isShallow = context.isShallow;
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return isShallow;
    } else if (key === ReactiveFlags.RAW) {
      return target;
    }

    const targetIsArray = isArray(target);

    let fn: Function | undefined;
    if (targetIsArray && (fn = arrayInstrumentations[key])) {
      return fn;
    }

    if (
      isShallow ||
      !isObject(value) ||
      isTrackSelf(context.getTrackingConfig()?.[key]) ||
      getTrackingType(context.getTrackingConfig()?.[key]) === 'shallow'
    ) {
      track(context, {
        type: TrackOpTypes.GET,
        key,
      });
    }

    if (isShallow || getTrackingType(context.getTrackingConfig()?.[key]) === 'shallow') {
      return value;
    }

    // If the value is an object, wrap it in another proxy
    if (isObject(value)) {
      return reactive(context.forkWithKey(key));
    }

    return value;
  },
  set(context, key, value, receiver) {
    const target = context.getPreviousValue() || context.getValue();

    const oldValue = target[key];

    if (
      !context.isShallow &&
      getTrackingType(context.getTrackingConfig()?.[key]) !== 'shallow' &&
      isObject(value) &&
      isObject(oldValue)
    )
      return true;

    const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
    // don't trigger if target is something up in the prototype chain of original

    if (!hadKey) {
      trigger(context, {
        target,
        type: TriggerOpTypes.ADD,
        key,
        oldValue: value,
      });
    } else if (hasChanged(value, oldValue)) {
      trigger(context, {
        target,
        type: TriggerOpTypes.SET,
        key,
        oldValue,
        newValue: value,
      });
    }

    return true;
  },

  has(context, key) {
    const target = context.getValue();

    const result = Reflect.has(target, key);

    if (!isSymbol(key) || !builtInSymbols.has(key)) {
      track(context, {
        type: TrackOpTypes.HAS,
        key,
      });
    }
    return result;
  },

  getOwnPropertyDescriptor(context, prop) {
    const target = context.getValue();
    return Reflect.getOwnPropertyDescriptor(target, prop);
  },

  ownKeys(context) {
    const target = context.getValue();

    track(context, { type: TrackOpTypes.ITERATE, key: isArray(target) ? 'length' : ITERATE_KEY });

    return Reflect.ownKeys(target);
  },
};

export function toReactive(context: ReactiveContext | Omit<ReactiveContextConfig, 'isShallow'>, value: any) {
  return isObject(value) ? reactive(context) : value;
}

class ReactiveContext {
  #basePath: string;
  #hookManager: HookManager;
  #rootKey: string;
  #hookIndex: number;
  #isShallow: boolean;
  #trackSelf?: boolean;

  constructor(config: ReactiveContextConfig) {
    this.#basePath = config.basePath || '';
    this.#hookIndex = config.hookIndex;
    this.#rootKey = config.rootKey || '';
    this.#hookManager = config.hookManager;
    this.#isShallow = config.isShallow;
    this.#trackSelf = config.trackSelf;
  }

  forkWithKey(key: string | symbol, isShallow = false) {
    return new ReactiveContext({
      basePath: buildPath(this.#basePath, key),
      hookIndex: this.#hookIndex,
      rootKey: this.#rootKey,
      hookManager: this.#hookManager,
      isShallow: isShallow,
    });
  }

  getPreviousResult(): any {
    return this.#hookManager.getHookPreviousResultAt(this.#hookIndex);
  }

  getResult(): any {
    return this.#hookManager.getHookResultAt(this.#hookIndex);
  }

  getRootValue(): any {
    const rootKey = this.#rootKey;

    return get(this.getResult(), rootKey);
  }

  getPreviousRootValue(): any {
    const rootKey = this.#rootKey;

    return get(this.getPreviousResult(), rootKey);
  }

  getValue(): any {
    const targetAccessor = getAccessor(this.#basePath);
    const target = targetAccessor.getValue(this.getRootValue());

    return target;
  }

  getPreviousValue(): any {
    const targetAccessor = getAccessor(this.#basePath);
    const target = targetAccessor.getValue(this.getPreviousRootValue());

    return target;
  }

  get basePath(): string {
    return this.#basePath;
  }

  get trackSelf(): boolean {
    return !!this.#trackSelf;
  }
  get hookIndex(): number {
    return this.#hookIndex;
  }

  get rootKey(): string {
    return this.#rootKey;
  }

  get hookManager(): HookManager {
    return this.#hookManager;
  }

  get isShallow(): boolean {
    return this.#isShallow;
  }

  trackKey(key: unknown) {
    const hookManager = this.#hookManager;
    const hookIndex = this.#hookIndex;
    const rootKey = this.#rootKey;
    const targetPath = this.#basePath;

    hookManager.trackPath(hookIndex, rootKey, targetPath, key);
  }

  getTrackingConfig() {
    const resolvedConfig = get(this.#hookManager.getTrackingConfigAt(this.#hookIndex), this.#rootKey);

    const targetAccessor = getAccessor(this.#basePath);
    return targetAccessor.getValue(resolvedConfig) as TrackingConfig;
  }

  getDeps() {
    const hookManager = this.#hookManager;
    const hookIndex = this.#hookIndex;
    const rootKey = this.#rootKey;
    const targetPath = this.#basePath;

    const deps = hookManager.getTargetDeps(hookIndex, rootKey, targetPath);
    if (!deps) return hookManager.createTargetDeps(hookIndex, rootKey, targetPath);
    return deps;
  }

  [TRACK]({ type, key }: { type: TrackOpTypes; key: unknown }): void {
    if (!shouldTrack || !activeSub) {
      return;
    }

    const target = this.getValue();

    this.trackKey(key);

    const depsMap = this.getDeps();

    let dep = depsMap.get(key);
    if (!dep) {
      dep = new Dep();
      dep.map = depsMap;
      dep.key = key;
      depsMap.set(key, dep);
    }

    if (__DEV__) {
      dep.track({ target, type, key });
    } else {
      dep.track();
    }
  }

  [TRIGGER]({
    target,
    type,
    key,
    newValue,
    oldValue,
    oldTarget,
  }: {
    target: any;
    type: TriggerOpTypes;
    key?: unknown;
    newValue?: unknown;
    oldValue?: unknown;
    oldTarget?: Map<unknown, unknown> | Set<unknown>;
  }): void {
    const depsMap = this.getDeps();

    if (!depsMap) {
      globalVersion++;
      return;
    }

    const run = (dep: Dep | undefined): void => {
      if (!dep) return;

      if (__DEV__) {
        dep.trigger({ target, type, key, newValue, oldValue, oldTarget });
      } else {
        dep.trigger();
      }
    };

    startBatch();

    if (type === TriggerOpTypes.CLEAR) {
      depsMap.forEach(run);
    } else {
      const targetIsArray = isArray(target);
      const isArrayIndex = targetIsArray && isIntegerKey(key);

      if (targetIsArray && key === 'length') {
        const newLength = Number(newValue);
        depsMap.forEach((dep, key) => {
          if (key === 'length' || key === ARRAY_ITERATE_KEY || (!isSymbol(key) && key >= newLength)) {
            run(dep);
          }
        });
      } else {
        if (key !== void 0 || depsMap.has(void 0)) {
          run(depsMap.get(key));
        }

        if (isArrayIndex) {
          run(depsMap.get(ARRAY_ITERATE_KEY));
        }

        switch (type) {
          case TriggerOpTypes.ADD:
            if (!targetIsArray) {
              run(depsMap.get(ITERATE_KEY));
              if (isMap(target)) {
                run(depsMap.get(MAP_KEY_ITERATE_KEY));
              }
            } else if (isArrayIndex) {
              run(depsMap.get('length'));
            }
            break;

          case TriggerOpTypes.DELETE:
            if (!targetIsArray) {
              run(depsMap.get(ITERATE_KEY));
              if (isMap(target)) {
                run(depsMap.get(MAP_KEY_ITERATE_KEY));
              }
            }
            break;

          case TriggerOpTypes.SET:
            if (isMap(target)) {
              run(depsMap.get(ITERATE_KEY));
            }
            break;
        }
      }
    }

    endBatch();
  }
}

export type { ReactiveContext };
type ReactiveObject = {} & ReactiveContext;
type ReactiveArray = any[] & ReactiveContext;

export function reactive(config: Omit<ReactiveContextConfig, 'isShallow'> | ReactiveContext): ReactiveObject | ReactiveArray {
  let context;
  if (config instanceof ReactiveContext) {
    context = config;
  } else {
    context = new ReactiveContext({ ...config, isShallow: false });
  }
  const target = context.getValue();

  const proxied = createProxy(target, context);

  return new Proxy(proxied, handler);
}

export function shallowReactive(config: Omit<ReactiveContextConfig, 'isShallow'>): ReactiveObject | ReactiveArray {
  const context = new ReactiveContext({ ...config, isShallow: true });
  const target = context.getValue();

  const proxied = createProxy(target, context);

  return new Proxy(proxied, handler);
}
