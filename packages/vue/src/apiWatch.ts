import {
  type WatchOptions as BaseWatchOptions,
  type DebuggerOptions,
  type ReactiveMarker,
  type WatchCallback,
  type WatchEffect,
  type WatchHandle,
  type WatchSource,
  watch as baseWatch,
} from './reactivity/index'
import {
  type SchedulerJob,
  SchedulerJobFlags,
  queueJob,
  callWithAsyncErrorHandling,
  type ComponentInternalInstance,
  currentInstance,
  setCurrentInstance,
  queuePostFlushCb,
  // type ObjectWatchOptionItem,
  // isInSSRComponentSetup,
} from '@unisonjs/core'
import { EMPTY_OBJ, NOOP, extend, isFunction, isString } from '@vue/shared'
// import { queuePostRenderEffect } from './renderer'
// import { useSSRContext } from './helpers/useSsrContext'
import { warn } from './reactivity/warning'

export type {
  WatchHandle,
  WatchStopHandle,
  WatchEffect,
  WatchSource,
  WatchCallback,
  OnCleanup,
} from './reactivity/index.ts'

type MaybeUndefined<T, I> = I extends true ? T | undefined : T

type MapSources<T, Immediate> = {
  [K in keyof T]: T[K] extends WatchSource<infer V>
  ? MaybeUndefined<V, Immediate>
  : T[K] extends object
  ? MaybeUndefined<T[K], Immediate>
  : never
}

export interface WatchEffectOptions extends DebuggerOptions {
  flush?: 'pre' | 'post' | 'sync' | 'insertion' | 'layout'
}

export interface WatchOptions<Immediate = boolean> extends WatchEffectOptions {
  immediate?: Immediate
  deep?: boolean | number
  once?: boolean
}

// Simple effect.
export function watchEffect(
  effect: WatchEffect,
  options?: WatchEffectOptions,
): WatchHandle {
  return doWatch(effect, null, options)
}

export function watchInsertionEffect(
  effect: WatchEffect,
  options?: DebuggerOptions,
): WatchHandle {
  return doWatch(
    effect,
    null,
    __DEV__ ? extend({}, options as any, { flush: 'insertion' }) : { flush: 'insertion' },
  )
}

export function watchLayoutEffect(
  effect: WatchEffect,
  options?: DebuggerOptions,
): WatchHandle {
  return doWatch(
    effect,
    null,
    __DEV__ ? extend({}, options as any, { flush: 'layout' }) : { flush: 'layout' },
  )
}

export function watchPostEffect(
  effect: WatchEffect,
  options?: DebuggerOptions,
): WatchHandle {
  return doWatch(
    effect,
    null,
    __DEV__ ? extend({}, options as any, { flush: 'post' }) : { flush: 'post' },
  )
}

export function watchSyncEffect(
  effect: WatchEffect,
  options?: DebuggerOptions,
): WatchHandle {
  return doWatch(
    effect,
    null,
    __DEV__ ? extend({}, options as any, { flush: 'sync' }) : { flush: 'sync' },
  )
}

export type MultiWatchSources = (WatchSource<unknown> | object)[]

// overload: single source + cb
export function watch<T, Immediate extends Readonly<boolean> = false>(
  source: WatchSource<T>,
  cb: WatchCallback<T, MaybeUndefined<T, Immediate>>,
  options?: WatchOptions<Immediate>,
): WatchHandle

// overload: reactive array or tuple of multiple sources + cb
export function watch<
  T extends Readonly<MultiWatchSources>,
  Immediate extends Readonly<boolean> = false,
>(
  sources: readonly [...T] | T,
  cb: [T] extends [ReactiveMarker]
    ? WatchCallback<T, MaybeUndefined<T, Immediate>>
    : WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
  options?: WatchOptions<Immediate>,
): WatchHandle

// overload: array of multiple sources + cb
export function watch<
  T extends MultiWatchSources,
  Immediate extends Readonly<boolean> = false,
>(
  sources: [...T],
  cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
  options?: WatchOptions<Immediate>,
): WatchHandle

// overload: watching reactive object w/ cb
export function watch<
  T extends object,
  Immediate extends Readonly<boolean> = false,
>(
  source: T,
  cb: WatchCallback<T, MaybeUndefined<T, Immediate>>,
  options?: WatchOptions<Immediate>,
): WatchHandle

// implementation
export function watch<T = any, Immediate extends Readonly<boolean> = false>(
  source: T | WatchSource<T>,
  cb: any,
  options?: WatchOptions<Immediate>,
): WatchHandle {
  if (__DEV__ && !isFunction(cb)) {
    warn(
      `\`watch(fn, options?)\` signature has been moved to a separate API. ` +
      `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` +
      `supports \`watch(source, cb, options?) signature.`,
    )
  }
  return doWatch(source as any, cb, options)
}

function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  options: WatchOptions = EMPTY_OBJ,
): WatchHandle {
  const { immediate, deep, flush, once } = options

  if (__DEV__ && !cb) {
    if (immediate !== undefined) {
      warn(
        `watch() "immediate" option is only respected when using the ` +
        `watch(source, callback, options?) signature.`,
      )
    }
    if (deep !== undefined) {
      warn(
        `watch() "deep" option is only respected when using the ` +
        `watch(source, callback, options?) signature.`,
      )
    }
    if (once !== undefined) {
      warn(
        `watch() "once" option is only respected when using the ` +
        `watch(source, callback, options?) signature.`,
      )
    }
  }

  const baseWatchOptions: BaseWatchOptions = extend({}, options)

  if (__DEV__) baseWatchOptions.onWarn = warn

  // let ssrCleanup: (() => void)[] | undefined
  // if (__SSR__ && isInSSRComponentSetup) {
  //   if (flush === 'sync') {
  //     const ctx = useSSRContext()!
  //     ssrCleanup = ctx.__watcherHandles || (ctx.__watcherHandles = [])
  //   } else if (!cb || immediate) {
  //     // immediately watch or watchEffect
  //     baseWatchOptions.once = true
  //   } else {
  //     return {
  //       stop: NOOP,
  //       resume: NOOP,
  //       pause: NOOP,
  //     } as WatchHandle
  //   }
  // }

  const instance = currentInstance
  baseWatchOptions.call = (fn, type, args) =>
    callWithAsyncErrorHandling(fn, instance, type, args)

  // scheduler
  let isPre = false
  switch (flush) {
    case 'post':
    case 'layout':
    case 'insertion':
      baseWatchOptions.scheduler = (job) => {
        const jobs = queuePostFlushCb(job);
        const instance = job.i as ComponentInternalInstance | undefined;
        if (instance) {
          for (let i = jobs.offset; i < jobs.offset + jobs.length; i++) {
            instance.queueEffect(flush, i);
          }
        }
      };
      break;
    case 'sync':
      break;
    default:
      // default: 'pre'
      isPre = true;
      baseWatchOptions.scheduler = (job, isFirstRun) => {
        if (isFirstRun) {
          job();
        } else {
          const instance = job.i as ComponentInternalInstance | undefined;
          const jobIndex = queueJob(job);
          if (instance) instance.queueEffect('pre', jobIndex);
        }
      };
      break;
  }

  baseWatchOptions.augmentJob = (job: SchedulerJob) => {
    // important: mark the job as a watcher callback so that scheduler knows
    // it is allowed to self-trigger (#1727)
    if (cb) {
      job.flags! |= SchedulerJobFlags.ALLOW_RECURSE
    }
    if (isPre) {
      job.flags! |= SchedulerJobFlags.PRE
      if (instance) {
        job.id = instance.uid
          ; (job as SchedulerJob).i = instance
      }
    }
  }

  const watchHandle = baseWatch(source, cb, baseWatchOptions)

  // if (__SSR__ && ssrCleanup) ssrCleanup.push(watchHandle)
  return watchHandle
}

// this.$watch
// export function instanceWatch(
//   this: ComponentInternalInstance,
//   source: string | Function,
//   value: WatchCallback | ObjectWatchOptionItem,
//   options?: WatchOptions,
// ): WatchHandle {
//   const publicThis = this.proxy as any
//   const getter = isString(source)
//     ? source.includes('.')
//       ? createPathGetter(publicThis, source)
//       : () => publicThis[source]
//     : source.bind(publicThis, publicThis)
//   let cb
//   if (isFunction(value)) {
//     cb = value
//   } else {
//     cb = value.handler as Function
//     options = value
//   }
//   const reset = setCurrentInstance(this)
//   const res = doWatch(getter, cb.bind(publicThis), options)
//   reset()
//   return res
// }

export function createPathGetter(ctx: any, path: string) {
  const segments = path.split('.')
  return (): any => {
    let cur = ctx
    for (let i = 0; i < segments.length && cur; i++) {
      cur = cur[segments[i]]
    }
    return cur
  }
}
