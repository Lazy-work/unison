/** @import { CollectionTypes, IterableCollections, WeakCollections, MapTypes, SetTypes, Instrumentations, ValueOf } from './types.js' */
/** @import { Target } from './reactive.js' */
import {
  isReadonly,
  isShallow,
  toRaw,
  toReactive,
  toReadonly,
} from './reactive.js'
import { ITERATE_KEY, MAP_KEY_ITERATE_KEY, track, trigger } from '@briddge/core'
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from './constants.js'
import { capitalize, hasChanged, hasOwn, isMap, toRawType } from '@vue/shared'
import { warn } from './warning.js'

/**
 *
 * @template {unknown} T
 * @param {T} value
 * @returns {T}
 */
const toShallow = (value) => value

/**
 *
 * @template {CollectionTypes} T
 * @param {T} v
 * @returns {*}
 */
const getProto = (v) =>
  Reflect.getPrototypeOf(v)

/**
 * 
 * @param {MapTypes} target
 * @param {*} key
 * @param {boolean} [isReadonly=false]
 * @param {boolean} [isShallow=false]
 * @returns {*}
 */
function get(
  target,
  key,
  isReadonly = false,
  isShallow = false,
) {
  // #1772: readonly(reactive(Map)) should return readonly + reactive version
  // of the value
  target = target[ReactiveFlags.RAW]
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  if (!isReadonly) {
    if (hasChanged(key, rawKey)) {
      track(rawTarget, TrackOpTypes.GET, key)
    }
    track(rawTarget, TrackOpTypes.GET, rawKey)
  }
  const { has } = getProto(rawTarget)
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
  if (has.call(rawTarget, key)) {
    return wrap(target.get(key))
  } else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey))
  } else if (target !== rawTarget) {
    // #3602 readonly(reactive(Map))
    // ensure that the nested reactive `Map` can do tracking for itself
    target.get(key)
  }
}


/**
 *
 * @param {CollectionTypes} this
 * @param {unknown} key
 * @param {boolean} [isReadonly=false]
 * @returns {boolean}
 */
function has(key, isReadonly = false) {
  const target = this[ReactiveFlags.RAW]
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  if (!isReadonly) {
    if (hasChanged(key, rawKey)) {
      track(rawTarget, TrackOpTypes.HAS, key)
    }
    track(rawTarget, TrackOpTypes.HAS, rawKey)
  }
  return key === rawKey
    ? target.has(key)
    : target.has(key) || target.has(rawKey)
}


/**
 *
 * @param {IterableCollections} target
 * @param {boolean} [isReadonly=false]
 * @returns {*}
 */
function size(target, isReadonly = false) {
  target = target[ReactiveFlags.RAW]
  !isReadonly && track(toRaw(target), TrackOpTypes.ITERATE, ITERATE_KEY)
  return Reflect.get(target, 'size', target)
}


/**
 *
 * @param {SetTypes} this
 * @param {unknown} value
 * @param {boolean} [_isShallow=false]
 * @returns {*}
 */
function add(value, _isShallow = false) {
  if (!_isShallow && !isShallow(value) && !isReadonly(value)) {
    value = toRaw(value)
  }
  const target = toRaw(this)
  const proto = getProto(target)
  const hadKey = proto.has.call(target, value)
  if (!hadKey) {
    target.add(value)
    trigger(target, TriggerOpTypes.ADD, value, value)
  }
  return this
}


/**
 *
 * @param {MapTypes} this
 * @param {unknown} key
 * @param {unknown} value
 * @param {boolean} [_isShallow=false]
 * @returns {*}
 */
function set(key, value, _isShallow = false) {
  if (!_isShallow && !isShallow(value) && !isReadonly(value)) {
    value = toRaw(value)
  }
  const target = toRaw(this)
  const { has, get } = getProto(target)

  let hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  } else if (!!(process.env.NODE_ENV !== 'production')) {
    checkIdentityKeys(target, has, key)
  }

  const oldValue = get.call(target, key)
  target.set(key, value)
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, key, value)
  } else if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }
  return this
}


/**
 *
 * @param {CollectionTypes} this
 * @param {unknown} key
 * @returns {*}
 */
function deleteEntry(key) {
  const target = toRaw(this)
  const { has, get } = getProto(target)
  let hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  } else if (!!(process.env.NODE_ENV !== 'production')) {
    checkIdentityKeys(target, has, key)
  }

  const oldValue = get ? get.call(target, key) : undefined
  // forward the operation before queueing reactions
  const result = target.delete(key)
  if (hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}


/**
 *
 * @param {IterableCollections} this
 * @returns {*}
 */
function clear() {
  const target = toRaw(this)
  const hadItems = target.size !== 0
  const oldTarget = !!(process.env.NODE_ENV !== 'production')
    ? isMap(target)
      ? new Map(target)
      : new Set(target)
    : undefined
  // forward the operation before queueing reactions
  const result = target.clear()
  if (hadItems) {
    trigger(target, TriggerOpTypes.CLEAR, undefined, undefined, oldTarget)
  }
  return result
}


/**
 *
 * @param {boolean} isReadonly
 * @param {boolean} isShallow
 * @returns {(this: IterableCollections, callback: Function, thisArg?: unknown) => any}
 */
function createForEach(isReadonly, isShallow) {
  return function forEach(
    callback,
    thisArg,
  ) {
    const observed = this
    const target = observed[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    !isReadonly && track(rawTarget, TrackOpTypes.ITERATE, ITERATE_KEY)
    return target.forEach((value, key) => {
      // important: make sure the callback is
      // 1. invoked with the reactive map as `this` and 3rd arg
      // 2. the value received should be a corresponding reactive/readonly.
      return callback.call(thisArg, wrap(value), wrap(key), observed)
    })
  }
}


/**
 *
 * @param {(string | symbol)} method
 * @param {boolean} isReadonly
 * @param {boolean} isShallow
 * @returns {(this: IterableCollections, ...args: []) => Iterable<unknown> & Iterator<unknown>}
 */
function createIterableMethod(
  method,
  isReadonly,
  isShallow,
) {
  return function (
    ...args
  ) {
    const target = this[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const targetIsMap = isMap(rawTarget)
    const isPair =
      method === 'entries' || (method === Symbol.iterator && targetIsMap)
    const isKeyOnly = method === 'keys' && targetIsMap
    const innerIterator = target[method](...args)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    !isReadonly &&
      track(
        rawTarget,
        TrackOpTypes.ITERATE,
        isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY,
      )
    // return a wrapped iterator which returns observed versions of the
    // values emitted from the real iterator
    return {
      // iterator protocol
      next() {
        const { value, done } = innerIterator.next()
        return done
          ? { value, done }
          : {
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done,
            }
      },
      // iterable protocol
      [Symbol.iterator]() {
        return this
      },
    }
  }
}

/**
 *
 * @param {ValueOf<typeof TriggerOpTypes>} type
 * @returns {Function}
 */
function createReadonlyMethod(type) {
  return function (...args) {
    if (!!(process.env.NODE_ENV !== 'production')) {
      const key = args[0] ? `on key "${args[0]}" ` : ``
      warn(
        `${capitalize(type)} operation ${key}failed: target is readonly.`,
        toRaw(this),
      )
    }
    return type === TriggerOpTypes.DELETE
      ? false
      : type === TriggerOpTypes.CLEAR
        ? undefined
        : this
  }
}

function createInstrumentations() {
  
  /**
   * Description placeholder
   *
   * @type {Instrumentations}
   */
  const mutableInstrumentations = {
    get(key) {
      return get(this, key)
    },
    get size() {
      return size(this)
    },
    has,
    add,
    set,
    delete: deleteEntry,
    clear,
    forEach: createForEach(false, false),
  }

  
  /**
   * Description placeholder
   *
   * @type {Instrumentations}
   */
  const shallowInstrumentations = {
    get(key) {
      return get(this, key, false, true)
    },
    get size() {
      return size(this)
    },
    has,
    add(value) {
      return add.call(this, value, true)
    },
    set(key, value) {
      return set.call(this, key, value, true)
    },
    delete: deleteEntry,
    clear,
    forEach: createForEach(false, true),
  }

  
  /**
   * Description placeholder
   *
   * @type {Instrumentations}
   */
  const readonlyInstrumentations = {
    get(key) {
      return get(this, key, true)
    },
    get size() {
      return size(this, true)
    },
    has(key) {
      return has.call(this, key, true)
    },
    add: createReadonlyMethod(TriggerOpTypes.ADD),
    set: createReadonlyMethod(TriggerOpTypes.SET),
    delete: createReadonlyMethod(TriggerOpTypes.DELETE),
    clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
    forEach: createForEach(true, false),
  }

  
  /**
   * Description placeholder
   *
   * @type {Instrumentations}
   */
  const shallowReadonlyInstrumentations = {
    get(key) {
      return get(this, key, true, true)
    },
    get size() {
      return size(this, true)
    },
    has(key) {
      return has.call(this, key, true)
    },
    add: createReadonlyMethod(TriggerOpTypes.ADD),
    set: createReadonlyMethod(TriggerOpTypes.SET),
    delete: createReadonlyMethod(TriggerOpTypes.DELETE),
    clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
    forEach: createForEach(true, true),
  }

  const iteratorMethods = /** @type {const} */ ([
    'keys',
    'values',
    'entries',
    Symbol.iterator,
  ])

  iteratorMethods.forEach(method => {
    mutableInstrumentations[method] = createIterableMethod(method, false, false)
    readonlyInstrumentations[method] = createIterableMethod(method, true, false)
    shallowInstrumentations[method] = createIterableMethod(method, false, true)
    shallowReadonlyInstrumentations[method] = createIterableMethod(
      method,
      true,
      true,
    )
  })

  return [
    mutableInstrumentations,
    readonlyInstrumentations,
    shallowInstrumentations,
    shallowReadonlyInstrumentations,
  ]
}

const [
  mutableInstrumentations,
  readonlyInstrumentations,
  shallowInstrumentations,
  shallowReadonlyInstrumentations,
] = /* @__PURE__*/ createInstrumentations()


/**
 *
 * @param {boolean} isReadonly
 * @param {boolean} shallow
 * @returns {(target: CollectionTypes, key: string | symbol, receiver: CollectionTypes) => any}
 */
function createInstrumentationGetter(isReadonly, shallow) {
  const instrumentations = shallow
    ? isReadonly
      ? shallowReadonlyInstrumentations
      : shallowInstrumentations
    : isReadonly
      ? readonlyInstrumentations
      : mutableInstrumentations

  return (
    target,
    key,
    receiver,
  ) => {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver,
    )
  }
}


/**
 *
 * @type {ProxyHandler<CollectionTypes>}
 */
export const mutableCollectionHandlers = {
  get: /*@__PURE__*/ createInstrumentationGetter(false, false),
}


/**
 *
 * @type {ProxyHandler<CollectionTypes>}
 */
export const shallowCollectionHandlers = {
  get: /*@__PURE__*/ createInstrumentationGetter(false, true),
}


/**
 *
 * @type {ProxyHandler<CollectionTypes>}
 */
export const readonlyCollectionHandlers = {
  get: /*@__PURE__*/ createInstrumentationGetter(true, false),
}


/**
 *
 * @type {ProxyHandler<CollectionTypes>}
 */
export const shallowReadonlyCollectionHandlers =
  {
    get: /*@__PURE__*/ createInstrumentationGetter(true, true),
  }

  
/**
 *
 * @param {CollectionTypes} target
 * @param {(key: unknown) => boolean} has
 * @param {unknown} key
 * @returns
 */
function checkIdentityKeys(
  target,
  has,
  key,
) {
  const rawKey = toRaw(key)
  if (rawKey !== key && has.call(target, rawKey)) {
    const type = toRawType(target)
    warn(
      `Reactive ${type} contains both the raw and reactive ` +
        `versions of the same object${type === `Map` ? ` as keys` : ``}, ` +
        `which can lead to inconsistencies. ` +
        `Avoid differentiating between the raw and reactive versions ` +
        `of an object and only use the reactive version if possible.`,
    )
  }
}
