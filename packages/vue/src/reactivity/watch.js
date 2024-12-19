/** @import {EffectScheduler} from '@briddge/core' */
/** @import {WatchErrorCodes, WatchHandle} from './types.js' */
import {
  EffectFlags,
  ReactiveEffect,
  getCurrentInstance,
  getCurrentScope,
  pauseTracking,
  resetTracking,
} from '@briddge/core'
import {
  EMPTY_OBJ,
  NOOP,
  hasChanged,
  isArray,
  isFunction,
  isMap,
  isObject,
  isPlainObject,
  isSet,
  remove,
} from '@vue/shared'
import { ReactiveFlags } from './constants.js'
import { isReactive, isShallow } from './reactive.js'
import { isRef } from './ref.js'
import { warn } from './warning.js'

// These errors were transferred from `packages/runtime-core/src/errorHandling.ts`
// to @vue/reactivity to allow co-location with the moved base watch logic, hence
// it is essential to keep these values unchanged.

/** @type {WatchErrorCodes} */
export const WatchErrorCodes = {
  WATCH_GETTER: 2,
  WATCH_CALLBACK: 3,
  WATCH_CLEANUP: 4,
};


// initial value for watchers to trigger on undefined initial values
const INITIAL_WATCHER_VALUE = {}

/**
 * @type {WeakMap<ReactiveEffect, (() => void)[]>}
 */
const cleanupMap = new WeakMap()

/**
 * @type {(ReactiveEffect | undefined)}
 */
let activeWatcher = undefined

/**
 * Returns the current active effect if there is one.
 *
 * @returns {ReactiveEffect<any> | undefined}
 */
export function getCurrentWatcher() {
  return activeWatcher
}

/**
 * Registers a cleanup callback on the current active effect. This
 * registered cleanup callback will be invoked right before the
 * associated effect re-runs.
 *
 * @param {() => void} cleanupFn - The callback function to attach to the effect's cleanup.
 * @param {boolean} failSilently - if `true`, will not throw warning when called without
 * an active effect.
 * @param {ReactiveEffect | undefined} owner - The effect that this cleanup function should be attached to.
 * By default, the current active effect.
 *
 * @returns
 */
export function onWatcherCleanup(
  cleanupFn,
  failSilently = false,
  owner = activeWatcher,
) {
  if (owner) {
    let cleanups = cleanupMap.get(owner)
    if (!cleanups) cleanupMap.set(owner, (cleanups = []))
    cleanups.push(cleanupFn)
  } else if (!!(process.env.NODE_ENV !== 'production') && !failSilently) {
    warn(
      `onWatcherCleanup() was called when there was no active watcher` +
      ` to associate with.`,
    )
  }
}


/**
 *
 * @param {(WatchSource | WatchSource[] | WatchEffect | object)} source
 * @param {?(WatchCallback | null)} [cb]
 * @param {WatchOptions} [options=EMPTY_OBJ]
 * @returns {WatchHandle}
 */
export function watch(
  source,
  cb,
  options = EMPTY_OBJ,
) {
  const { immediate, deep, once, scheduler, augmentJob, call } = options


  /**
   *
   * @param {unknown} s
   */
  const warnInvalidSource = (s) => {
    ; (options.onWarn || warn)(
      `Invalid watch source: `,
      s,
      `A watch source can only be a getter/effect function, a ref, ` +
      `a reactive object, or an array of these types.`,
    )
  }


  /**
   *
   * @param {object} source
   * @returns {unknown}
   */
  const reactiveGetter = (source) => {
    // traverse will happen in wrapped getter below
    if (deep) return source
    // for `deep: false | 0` or shallow reactive, only traverse root-level properties
    if (isShallow(source) || deep === false || deep === 0)
      return traverse(source, 1)
    // for `deep: undefined` on a reactive object, deeply traverse all properties
    return traverse(source)
  }

  /** @type {ReactiveEffect} */
  let effect
  /** @type {() => any} */
  let getter
  /** @type {(() => void) | undefined} */
  let cleanup
  /** @type {typeof onWatcherCleanup} */
  let boundCleanup
  let forceTrigger = false
  let isMultiSource = false

  if (isRef(source)) {
    getter = () => source.value
    forceTrigger = isShallow(source)
  } else if (isReactive(source)) {
    getter = () => reactiveGetter(source)
    forceTrigger = true
  } else if (isArray(source)) {
    isMultiSource = true
    forceTrigger = source.some(s => isReactive(s) || isShallow(s))
    getter = () =>
      source.map(s => {
        if (isRef(s)) {
          return s.value
        } else if (isReactive(s)) {
          return reactiveGetter(s)
        } else if (isFunction(s)) {
          return call ? call(s, WatchErrorCodes.WATCH_GETTER) : s()
        } else {
          !!(process.env.NODE_ENV !== 'production') && warnInvalidSource(s)
        }
      })
  } else if (isFunction(source)) {
    if (cb) {
      // getter with cb
      getter = call
        ? () => call(source, WatchErrorCodes.WATCH_GETTER)
        : /** @type {() => any} */ source
    } else {
      // no cb -> simple effect
      getter = () => {
        if (cleanup) {
          pauseTracking()
          try {
            cleanup()
          } finally {
            resetTracking()
          }
        }
        const currentEffect = activeWatcher
        activeWatcher = effect
        try {
          return call
            ? call(source, WatchErrorCodes.WATCH_CALLBACK, [boundCleanup])
            : source(boundCleanup)
        } finally {
          activeWatcher = currentEffect
        }
      }
    }
  } else {
    getter = NOOP
    !!(process.env.NODE_ENV !== 'production') && warnInvalidSource(source)
  }

  if (cb && deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : deep
    getter = () => traverse(baseGetter(), depth)
  }

  const scope = getCurrentScope()

  /** @type {WatchHandle} */
  const watchHandle = () => {
    effect.stop()
    if (scope) {
      remove(scope.effects, effect)
    }
  }

  if (once) {
    if (cb) {
      const _cb = cb
      cb = (...args) => {
        _cb(...args)
        watchHandle()
      }
    } else {
      const _getter = getter
      getter = () => {
        _getter()
        watchHandle()
      }
    }
  }

  let oldValue = isMultiSource
    ? new Array(source.length).fill(INITIAL_WATCHER_VALUE)
    : INITIAL_WATCHER_VALUE


  /**
   *
   * @param {?boolean} [immediateFirstRun]
   * @returns
   */
  const job = (immediateFirstRun) => {
    if (
      !(effect.flags & EffectFlags.ACTIVE) ||
      (!effect.dirty && !immediateFirstRun)
    ) {
      return
    }
    if (cb) {
      // watch(source, cb)
      const newValue = effect.run()
      if (
        deep ||
        forceTrigger ||
        (isMultiSource
          ? newValue.some((v, i) => hasChanged(v, oldValue[i]))
          : hasChanged(newValue, oldValue))
      ) {
        // cleanup before running cb again
        if (cleanup) {
          cleanup()
        }
        const currentWatcher = activeWatcher
        activeWatcher = effect
        try {
          const args = [
            newValue,
            // pass undefined as the old value when it's changed for the first time
            oldValue === INITIAL_WATCHER_VALUE
              ? undefined
              : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE
                ? []
                : oldValue,
            boundCleanup,
          ]
          call
            ? call(cb, WatchErrorCodes.WATCH_CALLBACK, args)
            : // @ts-expect-error
            cb(...args)
          oldValue = newValue
        } finally {
          activeWatcher = currentWatcher
        }
      }
    } else {
      // watchEffect
      effect.run()
    }
  }

  if (augmentJob) {
    augmentJob(job)
  }

  effect = new ReactiveEffect(getter)

  const instance = getCurrentInstance()
  effect.scheduler = scheduler
    ? () => scheduler(job, false)
    : /** @type {EffectScheduler} */ job

  if (instance) {
    job.i = instance
    job.position = instance.getEffectPosition()
  }

  boundCleanup = fn => onWatcherCleanup(fn, false, effect)

  cleanup = effect.onStop = () => {
    const cleanups = cleanupMap.get(effect)
    if (cleanups) {
      if (call) {
        call(cleanups, WatchErrorCodes.WATCH_CLEANUP)
      } else {
        for (const cleanup of cleanups) cleanup()
      }
      cleanupMap.delete(effect)
    }
  }

  if (!!(process.env.NODE_ENV !== 'production')) {
    effect.onTrack = options.onTrack
    effect.onTrigger = options.onTrigger
  }

  // initial run
  if (cb) {
    if (immediate) {
      job(true)
    } else {
      oldValue = effect.run()
    }
  } else if (scheduler) {
    scheduler(job.bind(null, true), true)
  } else {
    effect.run()
  }

  watchHandle.pause = effect.pause.bind(effect)
  watchHandle.resume = effect.resume.bind(effect)
  watchHandle.stop = watchHandle

  return watchHandle
}


/**
 *
 * @param {unknown} value
 * @param {number} [depth=Infinity]
 * @param {?Set<unknown>} [seen]
 * @returns {unknown}
 */
export function traverse(
  value,
  depth = Infinity,
  seen,
) {
  if (depth <= 0 || !isObject(value) || value[ReactiveFlags.SKIP]) {
    return value
  }

  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  depth--
  if (isRef(value)) {
    traverse(value.value, depth, seen)
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], depth, seen)
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach((v) => {
      traverse(v, depth, seen)
    })
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], depth, seen)
    }
    for (const key of Object.getOwnPropertySymbols(value)) {
      if (Object.prototype.propertyIsEnumerable.call(value, key)) {
        traverse(value[key], depth, seen)
      }
    }
  }
  return value
}
