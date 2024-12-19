/** @import { Target, UnwrapNestedRefs, DeepReadonly, Raw, TargetType } from './types.js' */
/** @import { Listener } from '@briddge/core' */
import { currentListener } from '@briddge/core';
import { def, hasOwn, isObject, toRawType } from '@vue/shared';
import { mutableHandlers, readonlyHandlers, shallowReactiveHandlers, shallowReadonlyHandlers } from './baseHandlers.js';
import {
  mutableCollectionHandlers,
  readonlyCollectionHandlers,
  shallowCollectionHandlers,
  shallowReadonlyCollectionHandlers,
} from './collectionHandlers.js';
import { ReactiveFlags } from './constants.js';
import { warn } from './warning.js';

/** @type {WeakMap<Target, any>} */
export const reactiveMap = new WeakMap();
/** @type {WeakMap<Target, any>} */
export const shallowReactiveMap = new WeakMap();

/** @type {WeakMap<Target, any>} */
export const readonlyMap = new WeakMap();
/** @type {WeakMap<Target, any>} */
export const shallowReadonlyMap = new WeakMap();

const TargetType = /** @type {TargetType} */ ({
  INVALID: 0,
  COMMON: 1,
  COLLECTION: 2,
});

/**
 *
 * @param {string} rawType
 * @returns {TargetType}
 */
function targetTypeMap(rawType) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return TargetType.COMMON;
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return TargetType.COLLECTION;
    default:
      return TargetType.INVALID;
  }
}

/**
 *
 * @param {Target} value
 * @returns {number}
 */
function getTargetType(value) {
  return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : targetTypeMap(toRawType(value));
}

/**
 * Returns a reactive proxy of the object.
 *
 * The reactive conversion is "deep": it affects all nested properties. A
 * reactive object also deeply unwraps any properties that are refs while
 * maintaining reactivity.
 *
 * @example
 * ```js
 * const obj = reactive({ count: 0 })
 * ```
 *
 * @overload
 * @template {object} T
 * @param {T} target - The source object.
 * @returns {Reactive<T>}
 * @see {@link https://vuejs.org/api/reactivity-core.html#reactive}
 */

/**
 *
 * @param {object} target
 * @returns {any}
 */
export function reactive(target) {
  // if trying to observe a readonly proxy, return the readonly version.
  if (isReadonly(target)) {
    return target;
  }
  return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
}

/**
 * Shallow version of {@link reactive()}.
 *
 * Unlike {@link reactive()}, there is no deep conversion: only root-level
 * properties are reactive for a shallow reactive object. Property values are
 * stored and exposed as-is - this also means properties with ref values will
 * not be automatically unwrapped.
 *
 * @example
 * ```js
 * const state = shallowReactive({
 *   foo: 1,
 *   nested: {
 *     bar: 2
 *   }
 * })
 *
 * // mutating state's own properties is reactive
 * state.foo++
 *
 * // ...but does not convert nested objects
 * isReactive(state.nested) // false
 *
 * // NOT reactive
 * state.nested.bar++
 * ```
 *
 * @template {object} T
 * @param {T} target - The source object.
 * @returns {ShallowReactive<T>}
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#shallowreactive}
 */
export function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveHandlers, shallowCollectionHandlers, shallowReactiveMap);
}

/**
 * Takes an object (reactive or plain) or a ref and returns a readonly proxy to
 * the original.
 *
 * A readonly proxy is deep: any nested property accessed will be readonly as
 * well. It also has the same ref-unwrapping behavior as {@link reactive()},
 * except the unwrapped values will also be made readonly.
 *
 * @example
 * ```js
 * const original = reactive({ count: 0 })
 *
 * const copy = readonly(original)
 *
 * watchEffect(() => {
 *   // works for reactivity tracking
 *   console.log(copy.count)
 * })
 *
 * // mutating original will trigger watchers relying on the copy
 * original.count++
 *
 * // mutating the copy will fail and result in a warning
 * copy.count++ // warning!
 * ```
 *
 * @template {object} T
 * @param {T} target - The source object.
 * @returns {DeepReadonly<UnwrapNestedRefs<T>>}
 * @see {@link https://vuejs.org/api/reactivity-core.html#readonly}
 */
export function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
}

/**
 * Shallow version of {@link readonly()}.
 *
 * Unlike {@link readonly()}, there is no deep conversion: only root-level
 * properties are made readonly. Property values are stored and exposed as-is -
 * this also means properties with ref values will not be automatically
 * unwrapped.
 *
 * @example
 * ```js
 * const state = shallowReadonly({
 *   foo: 1,
 *   nested: {
 *     bar: 2
 *   }
 * })
 *
 * // mutating state's own properties will fail
 * state.foo++
 *
 * // ...but works on nested objects
 * isReadonly(state.nested) // false
 *
 * // works
 * state.nested.bar++
 * ```
 * @template {object} T
 * @param {T} target - The source object.
 * @returns {Readonly<T>}
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#shallowreadonly}
 */
export function shallowReadonly(target) {
  return createReactiveObject(
    target,
    true,
    shallowReadonlyHandlers,
    shallowReadonlyCollectionHandlers,
    shallowReadonlyMap,
  );
}

/**
 *
 * @param {Target} target
 * @param {boolean} isReadonly
 * @param {ProxyHandler<any>} baseHandlers
 * @param {ProxyHandler<any>} collectionHandlers
 * @param {WeakMap<Target, any>} proxyMap
 * @returns
 */
function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
  if (!isObject(target)) {
    if (!!(process.env.NODE_ENV !== 'production')) {
      warn(`value cannot be made ${isReadonly ? 'readonly' : 'reactive'}: ${String(target)}`);
    }
    return target;
  }
  // target is already a Proxy, return it.
  // exception: calling readonly() on a reactive object
  if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
    return target;
  }
  // target already has corresponding Proxy
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  // only specific value types can be observed.
  const targetType = getTargetType(target);
  if (targetType === TargetType.INVALID) {
    return target;
  }
  const proxy = new Proxy(target, targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers);
  proxyMap.set(target, proxy);
  return proxy;
}

/**
 * Checks if an object is a proxy created by {@link reactive()} or
 * {@link shallowReactive()} (or {@link ref()} in some cases).
 *
 * @example
 * ```js
 * isReactive(reactive({}))            // => true
 * isReactive(readonly(reactive({})))  // => true
 * isReactive(ref({}).value)           // => true
 * isReactive(readonly(ref({})).value) // => true
 * isReactive(ref(true))               // => false
 * isReactive(shallowRef({}).value)    // => false
 * isReactive(shallowReactive({}))     // => true
 * ```
 *
 * @param {unknown} value - The value to check.
 * @returns {boolean}
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isreactive}
 */
export function isReactive(value) {
  if (isReadonly(value)) {
    return isReactive(value[ReactiveFlags.RAW]);
  }
  return !!(value && value[ReactiveFlags.IS_REACTIVE]);
}

/**
 * Checks whether the passed value is a readonly object. The properties of a
 * readonly object can change, but they can't be assigned directly via the
 * passed object.
 *
 * The proxies created by {@link readonly()} and {@link shallowReadonly()} are
 * both considered readonly, as is a computed ref without a set function.
 *
 * @param {unknown} value - The value to check.
 * @returns {boolean}
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isreadonly}
 */
export function isReadonly(value) {
  return !!(value && value[ReactiveFlags.IS_READONLY]);
}

/**
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isShallow(value) {
  return !!(value && value[ReactiveFlags.IS_SHALLOW]);
}

/**
 * Checks if an object is a proxy created by {@link reactive},
 * {@link readonly}, {@link shallowReactive} or {@link shallowReadonly()}.
 *
 * @param {any} value - The value to check.
 * @returns {boolean}
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isproxy}
 */
export function isProxy(value) {
  return value ? !!value[ReactiveFlags.RAW] : false;
}

/**
 * Returns the raw, original object of a Vue-created proxy.
 *
 * `toRaw()` can return the original object from proxies created by
 * {@link reactive()}, {@link readonly()}, {@link shallowReactive()} or
 * {@link shallowReadonly()}.
 *
 * This is an escape hatch that can be used to temporarily read without
 * incurring proxy access / tracking overhead or write without triggering
 * changes. It is **not** recommended to hold a persistent reference to the
 * original object. Use with caution.
 *
 * @example
 * ```js
 * const foo = {}
 * const reactiveFoo = reactive(foo)
 *
 * console.log(toRaw(reactiveFoo) === foo) // true
 * ```
 *
 * @template T
 * @param {T} observed - The object for which the "raw" value is requested.
 * @returns T
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#toraw}
 */
export function toRaw(observed) {
  const raw = observed && observed[ReactiveFlags.RAW];
  return raw ? toRaw(raw) : observed;
}

/**
 * Marks an object so that it will never be converted to a proxy. Returns the
 * object itself.
 *
 * @example
 * ```js
 * const foo = markRaw({})
 * console.log(isReactive(reactive(foo))) // false
 *
 * // also works when nested inside other reactive objects
 * const bar = reactive({ foo })
 * console.log(isReactive(bar.foo)) // false
 * ```
 *
 * **Warning:** `markRaw()` together with the shallow APIs such as
 * {@link shallowReactive()} allow you to selectively opt-out of the default
 * deep reactive/readonly conversion and embed raw, non-proxied objects in your
 * state graph.
 *
 * @template {object} T
 * @param {T} value - The object to be marked as "raw".
 * @returns {Raw<T>}
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#markraw}
 */
export function markRaw(value) {
  if (!hasOwn(value, ReactiveFlags.SKIP) && Object.isExtensible(value)) {
    def(value, ReactiveFlags.SKIP, true);
  }
  return value;
}

/**
 * Returns a reactive proxy of the given value (if possible).
 *
 * If the given value is not an object, the original value itself is returned.
 *
 * @template {unknown} T
 * @param {T} value - The value for which a reactive proxy shall be created.
 * @returns {T}
 */
export const toReactive = (value) => (isObject(value) ? reactive(value) : value);

/**
 * Returns a readonly proxy of the given value (if possible).
 *
 * If the given value is not an object, the original value itself is returned.
 *
 * @template {unknown} T
 * @param {T} value - The value for which a readonly proxy shall be created.
 * @returns {DeepReadonly<T>}
 */
export const toReadonly = (value) => (isObject(value) ? readonly(value) : value);

/** @type {WeakMap<Target, Map<any, Listener[]>} */
const listenerMap = new WeakMap();

/**
 *
 * @param {Target} target
 * @param {*} key
 */
export function subscribe(target, key) {
  if (!currentListener) return;

  let map = listenerMap.get(target);
  if (!map) {
    listenerMap.set(target, (map = new Map()));
  }
  let listeners = map.get(key);
  if (!listeners) {
    map.set(key, (listeners = []));
  }
  listeners.push(currentListener);
  map.set(key, listeners);
  if (!currentListener.cleanups) currentListener.cleanups = [];
  currentListener.cleanups.push(() => {
    listeners.filter((l) => l !== currentListener);
  });
}

export function triggerListeners(target, key, value, oldValue) {
  const map = listenerMap.get(target);
  if (!map) {
    return;
  }
  const listeners = map.get(key);
  if (!listeners) {
    return;
  }
  for (const listener of listeners) {
    listener.trigger?.(value, oldValue);
  }
}
