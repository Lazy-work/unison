/** @import { Listener } from '@briddge/core'  */
/** @import { ComputedRef } from './computed.js'  */
/** 
@import { 
  Ref,
  UnwrapRef,
  MaybeRef, 
  MaybeRefOrGetter,
  CustomRefFactory,
  ShallowUnwrapRef,
} from './types.js' 
*/
/** 
@import { 
  IfAny
} from '@vue/shared' 
*/

import { Dep, currentListener, getDepFromReactive } from '@briddge/core';
import { hasChanged, isArray, isFunction, isObject } from '@vue/shared';
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from './constants.js';
import { isProxy, isReactive, isReadonly, isShallow, toRaw, toReactive } from './reactive.js';
import { warn } from './warning.js';

/**
 * Checks if a value is a ref object.
 *
 * @overload
 * @template T
 * @param {Ref<T> | unknown} r - The value to inspect.
 * @returns {r is Ref<T>}
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isref}
 */

/**
 *
 * @param {*} r
 * @returns {r is Ref}
 */
export function isRef(r) {
  return r ? r[ReactiveFlags.IS_REF] === true : false;
}

/**
 * Takes an inner value and returns a reactive and mutable ref object, which
 * has a single property `.value` that points to the inner value.
 *
 * @overload
 * @template T
 * @param {T} value - The object to wrap in the ref.
 * @returns {([T] extends [Ref] ? IfAny<T, Ref<T>, T> : Ref<UnwrapRef<T>, UnwrapRef<T> | T>)}
 * @see {@link https://vuejs.org/api/reactivity-core.html#ref}
 */

/**
 *
 * @overload
 * @template [T=any]
 * @returns {Ref<T | undefined>}
 */

/**
 *
 * @param {?unknown} [value]
 * @returns {Ref<T, T>}
 */
export function ref(value) {
  return createRef(value, false);
}

const count = ref(0);

/**
 * Shallow version of {@link ref()}.
 *
 * @example
 * ```js
 * const state = shallowRef({ count: 1 })
 *
 * // does NOT trigger change
 * state.value.count = 2
 *
 * // does trigger change
 * state.value = { count: 2 }
 * ```
 *
 * @template T
 * @param {T} value - The "inner value" for the shallow ref.
 * @returns {Ref extends T
 *   ? T extends Ref
 *   ? IfAny<T, ShallowRef<T>, T>
 *   : ShallowRef<T>
 *   : ShallowRef<T>}
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#shallowref}
 */

/**
 *
 * @overload
 * @template [T=any]
 * @returns {ShallowRef<T | undefined>}
 */

/**
 *
 * @param {?unknown} [value]
 * @returns {unknown}
 */
export function shallowRef(value) {
  return createRef(value, true);
}

/**
 *
 * @param {unknown} rawValue
 * @param {boolean} shallow
 * @returns {unknown}
 */
function createRef(rawValue, shallow) {
  if (isRef(rawValue)) {
    return rawValue;
  }
  return new RefImpl(rawValue, shallow);
}

/**
 * @internal
 * @template {any} T
 */
class RefImpl {
  /**
   * @type {T}
   */
  _value;

  /**
   *
   * @private
   * @type {T}
   */
  _rawValue;

  /**
   *
   * @private
   * @type {(Listener[] | null)}
   */
  _listeners = null;

  /**
   *
   * @type {Dep}
   */
  dep = new Dep();

  /**
   *
   * @public
   * @readonly
   * @type {true}
   */
  [ReactiveFlags.IS_REF] = true;

  /**
   *
   * @public
   * @readonly
   * @type {boolean}
   */
  [ReactiveFlags.IS_SHALLOW] = false;

  /**
   * Creates an instance of RefImpl.
   *
   * @constructor
   * @param {T} value
   * @param {boolean} isShallow
   */
  constructor(value, isShallow) {
    this._rawValue = isShallow ? value : toRaw(value);
    this._value = isShallow ? value : toReactive(value);
    this[ReactiveFlags.IS_SHALLOW] = isShallow;
  }

  get value() {
    // append react listener
    if (currentListener) {
      const listeners = this._listeners ?? [];
      listeners.push(currentListener);
      this._listeners = listeners;
    }

    if (!!(process.env.NODE_ENV !== 'production')) {
      this.dep.track({
        target: this,
        type: TrackOpTypes.GET,
        key: 'value',
      });
    } else {
      this.dep.track();
    }

    return this._value;
  }

  set value(newValue) {
    const oldValue = this._rawValue;
    const useDirectValue = this[ReactiveFlags.IS_SHALLOW] || isShallow(newValue) || isReadonly(newValue);
    newValue = useDirectValue ? newValue : toRaw(newValue);
    if (hasChanged(newValue, oldValue)) {
      this._rawValue = newValue;
      this._value = useDirectValue ? newValue : toReactive(newValue);

      // trigger react listeners
      if (this._listeners) {
        for (const listener of this._listeners) listener.trigger?.(newValue, oldValue);
        this._listeners.length = 0;
      }

      if (!!(process.env.NODE_ENV !== 'production')) {
        this.dep.trigger({
          target: this,
          type: TriggerOpTypes.SET,
          key: 'value',
          newValue,
          oldValue,
        });
      } else {
        this.dep.trigger();
      }
    }
  }
}

/**
 * Force trigger effects that depends on a shallow ref. This is typically used
 * after making deep mutations to the inner value of a shallow ref.
 *
 * @example
 * ```js
 * const shallow = shallowRef({
 *   greet: 'Hello, world'
 * })
 *
 * // Logs "Hello, world" once for the first run-through
 * watchEffect(() => {
 *   console.log(shallow.value.greet)
 * })
 *
 * // This won't trigger the effect because the ref is shallow
 * shallow.value.greet = 'Hello, universe'
 *
 * // Logs "Hello, universe"
 * triggerRef(shallow)
 * ```
 *
 * @param {Ref} ref - The ref whose tied effects shall be executed.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#triggerref}
 */
export function triggerRef(ref) {
  if (!!(process.env.NODE_ENV !== 'production')) {
    ref.dep.trigger({
      target: ref,
      type: TriggerOpTypes.SET,
      key: 'value',
      newValue: ref._value,
    });
  } else {
    ref.dep.trigger();
  }
}

/**
 * Returns the inner value if the argument is a ref, otherwise return the
 * argument itself. This is a sugar function for
 * `val = isRef(val) ? val.value : val`.
 *
 * @example
 * ```js
 * function useFoo(x: number | Ref<number>) {
 *   const unwrapped = unref(x)
 *   // unwrapped is guaranteed to be number now
 * }
 * ```
 *
 * @template T
 * @param {MaybeRef<T> | ComputedRef<T>} ref - Ref or plain value to be converted into the plain value.
 * @returns {T}
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#unref}
 */
export function unref(ref) {
  return isRef(ref) ? ref.value : ref;
}

/**
 * Normalizes values / refs / getters to values.
 * This is similar to {@link unref()}, except that it also normalizes getters.
 * If the argument is a getter, it will be invoked and its return value will
 * be returned.
 *
 * @example
 * ```js
 * toValue(1) // 1
 * toValue(ref(1)) // 1
 * toValue(() => 1) // 1
 * ```
 *
 * @template T
 * @param {MaybeRefOrGetter<T>} source - A getter, an existing ref, or a non-function value.
 * @returns {T}
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#tovalue}
 */
export function toValue(source) {
  return isFunction(source) ? source() : unref(source);
}

/**
 * @type {ProxyHandler<any>}
 */
const shallowUnwrapHandlers = {
  get: (target, key, receiver) => (key === ReactiveFlags.RAW ? target : unref(Reflect.get(target, key, receiver))),
  set: (target, key, value, receiver) => {
    const oldValue = target[key];
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    } else {
      return Reflect.set(target, key, value, receiver);
    }
  },
};

/**
 * Returns a proxy for the given object that shallowly unwraps properties that
 * are refs. If the object already is reactive, it's returned as-is. If not, a
 * new reactive proxy is created.
 *
 * @template {object} T
 * @param {T} objectWithRefs - Either an already-reactive object or a simple object
 * @returns {ShallowUnwrapRef<T>}
 * that contains refs.
 */
export function proxyRefs(objectWithRefs) {
  return isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers);
}

/**
 *
 * @class CustomRefImpl
 * @template T
 */
class CustomRefImpl {
  /**
   * @public
   * @type {Dep}
   */
  dep;

  /**
   *
   * @private
   * @readonly
   * @type {ReturnType<CustomRefFactory<T>>['get']}
   */
  _get;

  /**
   *
   * @private
   * @readonly
   * @type {ReturnType<CustomRefFactory<T>>['set']}
   */
  _set;

  /**
   *
   * @public
   * @readonly
   * @type {true}
   */
  [ReactiveFlags.IS_REF] = true;

  /**
   *
   * @public
   * @type {T}
   */
  _value = undefined;

  /**
   * Creates an instance of CustomRefImpl.
   *
   * @constructor
   * @param {CustomRefFactory<T>} factory
   */
  constructor(factory) {
    const dep = (this.dep = new Dep());
    const { get, set } = factory(dep.track.bind(dep), dep.trigger.bind(dep));
    this._get = get;
    this._set = set;
  }

  get value() {
    return (this._value = this._get());
  }

  set value(newVal) {
    this._set(newVal);
  }
}

/**
 * Creates a customized ref with explicit control over its dependency tracking
 * and updates triggering.
 *
 * @template T
 * @param {CustomRefFactory<T>} factory - The function that receives the `track` and `trigger` callbacks.
 * @returns {Ref<T>}
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#customref}
 */
export function customRef(factory) {
  return new CustomRefImpl(factory);
}

/**
 * Converts a reactive object to a plain object where each property of the
 * resulting object is a ref pointing to the corresponding property of the
 * original object. Each individual ref is created using {@link toRef()}.
 *
 * @template {object} T
 * @param {T} object - Reactive object to be made into an object of linked refs.
 * @returns {ToRefs<T>}
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#torefs}
 */
export function toRefs(object) {
  if (!!(process.env.NODE_ENV !== 'production') && !isProxy(object)) {
    warn(`toRefs() expects a reactive object but received a plain one.`);
  }
  const ret = isArray(object) ? new Array(object.length) : {};
  for (const key in object) {
    ret[key] = propertyToRef(object, key);
  }
  return ret;
}

/**
 *
 * @class ObjectRefImpl
 * @template {object} T
 * @template {keyof T} K
 */
class ObjectRefImpl {
  /**
   *
   * @public
   * @readonly
   * @type {true}
   */
  [ReactiveFlags.IS_REF] = true;

  /**
   *
   * @public
   * @type {T[K]}
   */
  _value = undefined;

  /**
   *
   * @private
   * @readonly
   * @type {T}
   */
  _object;

  /**
   *
   * @private
   * @readonly
   * @type {K}
   */
  _key;

  /**
   *
   * @private
   * @readonly
   * @type {?T[K]}
   */
  _defaultValue;
  /**
   * Creates an instance of ObjectRefImpl.
   *
   * @constructor
   * @param {T} _object
   * @param {K} _key
   * @param {?T[K]} [_defaultValue]
   */
  constructor(_object, _key, _defaultValue) {
    this._object = _object;
    this._key = _key;
    this._defaultValue = _defaultValue;
  }

  get value() {
    const val = this._object[this._key];
    return (this._value = val === undefined ? this._defaultValue : val);
  }

  set value(newVal) {
    this._object[this._key] = newVal;
  }

  /**
   *
   * @readonly
   * @type {(Dep | undefined)}
   */
  get dep() {
    return getDepFromReactive(toRaw(this._object), this._key);
  }
}

/**
 *
 * @class GetterRefImpl
 * @template T
 */
class GetterRefImpl {
  /**
   *
   * @public
   * @readonly
   * @type {true}
   */
  [ReactiveFlags.IS_REF] = true;

  /**
   *
   * @public
   * @readonly
   * @type {true}
   */
  [ReactiveFlags.IS_READONLY] = true;

  /**
   *
   * @public
   * @type {T}
   */
  _value = undefined;

  /**
   *
   * @private
   * @readonly
   * @type {() => T}
   */
  _getter;
  /**
   * Creates an instance of GetterRefImpl.
   *
   * @constructor
   * @param {() => T} _getter
   */
  constructor(_getter) {
    this._getter = _getter;
  }
  get value() {
    return (this._value = this._getter());
  }
}

/**
 * Used to normalize values / refs / getters into refs.
 *
 * @example
 * ```js
 * // returns existing refs as-is
 * toRef(existingRef)
 *
 * // creates a ref that calls the getter on .value access
 * toRef(() => props.foo)
 *
 * // creates normal refs from non-function values
 * // equivalent to ref(1)
 * toRef(1)
 * ```
 *
 * Can also be used to create a ref for a property on a source reactive object.
 * The created ref is synced with its source property: mutating the source
 * property will update the ref, and vice-versa.
 *
 * @example
 * ```js
 * const state = reactive({
 *   foo: 1,
 *   bar: 2
 * })
 *
 * const fooRef = toRef(state, 'foo')
 *
 * // mutating the ref updates the original
 * fooRef.value++
 * console.log(state.foo) // 2
 *
 * // mutating the original also updates the ref
 * state.foo++
 * console.log(fooRef.value) // 3
 * ```
 *
 * @overload
 * @template T
 * @param {T} source - A getter, an existing ref, a non-function value, or a
 *                 reactive object to create a property ref from.
 * @param [key] - (optional) Name of the property in the reactive object.
 * @returns {T extends () => infer R
 *   ? Readonly<Ref<R>>
 *   : T extends Ref
 *   ? T
 *   : Ref<UnwrapRef<T>>}
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#toref}
 */

/**
 *
 * @overload
 * @template T
 * @param {T} value
 * @returns {T extends () => infer R
 *   ? Readonly<Ref<R>>
 *   : T extends Ref
 *   ? T
 *   : Ref<UnwrapRef<T>>}
 */

/**
 *
 * @overload
 * @template {object} T
 * @template {keyof T} K
 * @param {T} object
 * @param {K} key
 * @returns {ToRef<T[K]>}
 */

/**
 *
 * @overload
 * @template {object} T
 * @template {keyof T} K
 * @param {T} object
 * @param {K} key
 * @param {T[K]} defaultValue
 * @returns {ToRef<Exclude<T[K], undefined>>}
 */

/**
 *
 * @param {(Record<string, any> | MaybeRef)} source
 * @param {?string} [key]
 * @param {?unknown} [defaultValue]
 * @returns {Ref}
 */
export function toRef(source, key, defaultValue) {
  if (isRef(source)) {
    return source;
  } else if (isFunction(source)) {
    return new GetterRefImpl(source);
  } else if (isObject(source) && arguments.length > 1) {
    return propertyToRef(source, key, defaultValue);
  } else {
    return ref(source);
  }
}

/**
 *
 * @param {Record<string, any>} source
 * @param {string} key
 * @param {?unknown} [defaultValue]
 * @returns {*}
 */
function propertyToRef(source, key, defaultValue) {
  const val = source[key];
  return isRef(val) ? val : new ObjectRefImpl(source, key, defaultValue);
}
