/** @import { ComputedGetter, ComputedSetter, WritableComputedOptions } from './types.js' */
/** @import { DebuggerEvent, DebuggerOptions, Link, Subscriber  } from '@briddge/core' */
import {
    Dep,
    EffectFlags,
    activeSub,
    globalVersion,
    refreshComputed,
} from '@briddge/core'
import { isFunction } from '@vue/shared'
import { ReactiveFlags, TrackOpTypes } from './constants.js'
import { warn } from './warning.js'

/**
 * @template {any} T
 * @implements {Subscriber}
 * @private exported by @vue/reactivity for Vue core use, but not exported from
 * the main vue package
 */
export class ComputedRefImpl {
  /**
   * @internal
   * @type {any}
   */
  _value = undefined
  /**
   * @internal
   * @type {Dep}
   * @readonly
   */
  dep = new Dep(this)
  /**
   * @internal
   * @readonly
   */
  __v_isRef = true
  // TODO isolatedDeclarations ReactiveFlags.IS_REF
  /**
   * @internal
   * @type {boolean}
   * @readonly
   */
  __v_isReadonly
  // TODO isolatedDeclarations ReactiveFlags.IS_READONLY
  // A computed is also a subscriber that tracks other deps
  /**
   * @internal
   * @type {?Link}
   */
  deps = undefined
  /**
   * @internal
   * @type {?Link}
   */
  depsTail = undefined
  /**
   * @internal
   * @type {?EffectFlags}
   */
  flags = EffectFlags.DIRTY
  /**
   * @internal
   * @type {number}
   */
  globalVersion = globalVersion - 1
  /**
   * @internal
   * @type {boolean}
   */
  isSSR
  /**
   * for backwards compat
   * @type {this}
   */
  effect = this
  
  /**
   * Dev only
   * @type {?(event: DebuggerEvent) => void}
   */
  onTrack
  
  /**
   * Dev only
   * @type {?(event: DebuggerEvent) => void}
   */
  onTrigger

  /**
   * Dev only
   * @type {?boolean}
   * @internal
   */
  _warnRecursive

  
  /**
   * 
   * @private
   * @readonly
   * @type {ComputedSetter<T> | undefined}
   */
  setter

  
  /**
   * @public
   * @type {ComputedGetter<T>}
   */
  fn
  
  /**
   * Creates an instance of ComputedRefImpl.
   *
   * @constructor
   * @param {ComputedGetter<T>} fn
   * @param {(ComputedSetter<T> | undefined)} setter
   * @param {boolean} isSSR
   */
  constructor(
    fn,
    setter,
    isSSR,
  ) {
    this.fn = fn
    this.setter = setter
    this[ReactiveFlags.IS_READONLY] = !setter
    this.isSSR = isSSR
  }

  /**
   * @internal
   */
  notify() {
    this.flags |= EffectFlags.DIRTY
    // avoid infinite self recursion
    if (activeSub !== this) {
      this.dep.notify()
    } else if (!!(process.env.NODE_ENV !== 'production')) {
      // TODO warn
    }
  }

  
  /**
   * @returns {T}
   */
  get value() {
    const link = !!(process.env.NODE_ENV !== 'production')
      ? this.dep.track({
          target: this,
          type: TrackOpTypes.GET,
          key: 'value',
        })
      : this.dep.track()
    refreshComputed(this)
    // sync version after evaluation
    if (link) {
      link.version = this.dep.version
    }
    return this._value
  }

  set value(newValue) {
    if (this.setter) {
      this.setter(newValue)
    } else if (!!(process.env.NODE_ENV !== 'production')) {
      warn('Write operation failed: computed value is readonly')
    }
  }
}

/**
 * Takes a getter function and returns a readonly reactive ref object for the
 * returned value from the getter. It can also take an object with get and set
 * functions to create a writable ref object.
 *
 * @example
 * ```js
 * // Creating a readonly computed ref:
 * const count = ref(1)
 * const plusOne = computed(() => count.value + 1)
 *
 * console.log(plusOne.value) // 2
 * plusOne.value++ // error
 * ```
 *
 * ```js
 * // Creating a writable computed ref:
 * const count = ref(1)
 * const plusOne = computed({
 *   get: () => count.value + 1,
 *   set: (val) => {
 *     count.value = val - 1
 *   }
 * })
 *
 * plusOne.value = 1
 * console.log(count.value) // 0
 * ```
 * @overload
 * @param getter - Function that produces the next value.
 * @param debugOptions - For debugging. See {@link https://vuejs.org/guide/extras/reactivity-in-depth.html#computed-debugging}.
 * @see {@link https://vuejs.org/api/reactivity-core.html#computed}
 */


/**
 *
 * @overload
 * @template T
 * @param {ComputedGetter<T>} getter - Function that produces the next value.
 * @param {?DebuggerOptions} [debugOptions] - For debugging. See {@link https://vuejs.org/guide/extras/reactivity-in-depth.html#computed-debugging}.
 * @returns {ComputedRef<T>}
 */

/**
 * 
 * @overload
 * @template T
 * @template [S=T]
 * @param {WritableComputedOptions<T, S>} options - Function that produces the next value.
 * @param {?DebuggerOptions} [debugOptions] - For debugging. See {@link https://vuejs.org/guide/extras/reactivity-in-depth.html#computed-debugging}.
 * @returns {WritableComputedRef<T, S>}
 */

/**
 *
 * @overload
 * @template T
 * @param {(ComputedGetter<T> | WritableComputedOptions<T>)} getterOrOptions - Function that produces the next value.
 * @param {?DebuggerOptions} [debugOptions] - For debugging. See {@link https://vuejs.org/guide/extras/reactivity-in-depth.html#computed-debugging}.
 * @param {boolean} [isSSR=false]
 * @returns
 */
export function computed(
  getterOrOptions,
  debugOptions,
  isSSR = false,
) {
  
  /**
   * @type {ComputedGetter<T>}
   */
  let getter
  
  /**
   * @type {(ComputedSetter<T> | undefined)}
   */
  let setter

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  const cRef = new ComputedRefImpl(getter, setter, isSSR)

  if (!!(process.env.NODE_ENV !== 'production') && debugOptions && !isSSR) {
    cRef.onTrack = debugOptions.onTrack
    cRef.onTrigger = debugOptions.onTrigger
  }

  return cRef
}
