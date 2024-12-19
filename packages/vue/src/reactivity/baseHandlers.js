/** @import { Target } from './types.js' */
import { ITERATE_KEY, track, trigger } from '@briddge/core'
import {
  hasChanged,
  hasOwn,
  isArray,
  isIntegerKey,
  isObject,
  isSymbol,
  makeMap,
} from '@vue/shared'
import { arrayInstrumentations } from './arrayInstrumentations.js'
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from './constants.js'
import {
  isReadonly,
  isShallow,
  reactive,
  reactiveMap,
  readonly,
  readonlyMap,
  shallowReactiveMap,
  shallowReadonlyMap,
  toRaw,
} from './reactive.js'
import { isRef } from './ref.js'
import { warn } from './warning.js'

const isNonTrackableKeys = /*@__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`)

const builtInSymbols = new Set(
  /*@__PURE__*/
  Object.getOwnPropertyNames(Symbol)
    // ios10.x Object.getOwnPropertyNames(Symbol) can enumerate 'arguments' and 'caller'
    // but accessing them on Symbol leads to TypeError because Symbol is a strict mode
    // function
    .filter(key => key !== 'arguments' && key !== 'caller')
    .map(key => Symbol[key])
    .filter(isSymbol),
)


/**
 *
 * @param {unknown} key
 * @returns {*}
 */
function hasOwnProperty(key) {
  // #10455 hasOwnProperty may be called with non-string values
  if (!isSymbol(key)) key = String(key)
  const obj = toRaw(this)
  track(obj, TrackOpTypes.HAS, key)
  return obj.hasOwnProperty(/** @type {string} */ key)
}


/**
 *
 * @class BaseReactiveHandler
 * @implements {ProxyHandler<Target>}
 */
class BaseReactiveHandler {
  /**
   * @protected
   * @type {boolean}
   */
  _isReadonly

  /**
 * @protected
 * @type {boolean}
 */
  _isShallow


  /**
   * Creates an instance of BaseReactiveHandler.
   *
   * @constructor
   * @param {boolean} [_isReadonly=false]
   * @param {boolean} [_isShallow=false]
   */
  constructor(
    _isReadonly = false,
    _isShallow = false,
  ) {
    this._isReadonly = _isReadonly;
    this._isShallow = _isShallow;
  }


  /**
   *
   * @param {Target} target
   * @param {(string | symbol)} key
   * @param {object} receiver
   * @returns {*}
   */
  get(target, key, receiver) {
    const isReadonly = this._isReadonly,
      isShallow = this._isShallow
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return isShallow
    } else if (key === ReactiveFlags.RAW) {
      if (
        receiver ===
        (isReadonly
          ? isShallow
            ? shallowReadonlyMap
            : readonlyMap
          : isShallow
            ? shallowReactiveMap
            : reactiveMap
        ).get(target) ||
        // receiver is not the reactive proxy, but has the same prototype
        // this means the receiver is a user proxy of the reactive proxy
        Object.getPrototypeOf(target) === Object.getPrototypeOf(receiver)
      ) {
        return target
      }
      // early return undefined
      return
    }

    const targetIsArray = isArray(target)

    if (!isReadonly) {
      /** @type {Function | undefined} */
      let fn
      if (targetIsArray && (fn = arrayInstrumentations[key])) {
        return fn
      }
      if (key === 'hasOwnProperty') {
        return hasOwnProperty
      }
    }

    const res = Reflect.get(
      target,
      key,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      isRef(target) ? target : receiver,
    )

    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res
    }

    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }

    if (isShallow) {
      return res
    }

    if (isRef(res)) {
      // ref unwrapping - skip unwrap for Array + integer key.
      return targetIsArray && isIntegerKey(key) ? res : res.value
    }

    if (isObject(res)) {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(false, isShallow)
  }


  /**
   *
   * @param {Record<string | symbol, unknown>} target
   * @param {(string | symbol)} key
   * @param {unknown} value
   * @param {object} receiver
   * @returns {boolean}
   */
  set(
    target,
    key,
    value,
    receiver,
  ) {
    let oldValue = target[key]
    if (!this._isShallow) {
      const isOldValueReadonly = isReadonly(oldValue)
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue)
        value = toRaw(value)
      }
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        if (isOldValueReadonly) {
          return false
        } else {
          oldValue.value = value
          return true
        }
      }
    } else {
      // in shallow mode, objects are set as-is regardless of reactive or not
    }

    const hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)
    const result = Reflect.set(
      target,
      key,
      value,
      isRef(target) ? target : receiver,
    )
    // don't trigger if target is something up in the prototype chain of original
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    return result
  }


  /**
   *
   * @param {Record<string | symbol, unknown>} target
   * @param {(string | symbol)} key
   * @returns {boolean}
   */
  deleteProperty(
    target,
    key,
  ) {
    const hadKey = hasOwn(target, key)
    const oldValue = target[key]
    const result = Reflect.deleteProperty(target, key)
    if (result && hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    return result
  }


  /**
   *
   * @param {Record<string | symbol, unknown>} target
   * @param {(string | symbol)} key
   * @returns {boolean}
   */
  has(target, key) {
    const result = Reflect.has(target, key)
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
      track(target, TrackOpTypes.HAS, key)
    }
    return result
  }


  /**
   *
   * @param {Record<string | symbol, unknown>} target
   * @returns {(string | symbol)[]}
   */
  ownKeys(target) {
    track(
      target,
      TrackOpTypes.ITERATE,
      isArray(target) ? 'length' : ITERATE_KEY,
    )
    return Reflect.ownKeys(target)
  }
}

class ReadonlyReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(true, isShallow)
  }


  /**
   *
   * @param {object} target
   * @param {(string | symbol)} key
   * @returns {boolean}
   */
  set(target, key) {
    if (!!(process.env.NODE_ENV !== 'production')) {
      warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target,
      )
    }
    return true
  }


  /**
   *
   * @param {object} target
   * @param {(string | symbol)} key
   * @returns {boolean}
   */
  deleteProperty(target, key) {
    if (!!(process.env.NODE_ENV !== 'production')) {
      warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target,
      )
    }
    return true
  }
}

/** @type {ProxyHandler<object>} */
export const mutableHandlers =
  /*@__PURE__*/ new MutableReactiveHandler()

/** @type {ProxyHandler<object>} */
export const readonlyHandlers =
  /*@__PURE__*/ new ReadonlyReactiveHandler()

/** @type {MutableReactiveHandler} */
export const shallowReactiveHandlers =
  /*@__PURE__*/ new MutableReactiveHandler(true)

// Props handlers are special in the sense that it should not unwrap top-level
// refs (in order to allow refs to be explicitly passed down), but should
// retain the reactivity of the normal readonly object.

/** @type {ReadonlyReactiveHandler} */
export const shallowReadonlyHandlers =
  /*@__PURE__*/ new ReadonlyReactiveHandler(true)
