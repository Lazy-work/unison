/**
@import {
  WatchOptions as BaseWatchOptions,
  DebuggerOptions,
  ReactiveMarker,
  WatchCallback,
  WatchEffect,
  WatchHandle,
  WatchSource,
  watch as baseWatch,
} from './reactivity/index.js';

@import {
  WatchOptions,
  MaybeUndefined,
  MapSources,
  MultiWatchSources,
  WatchEffectOptions
} from './types.js';

@import { SchedulerJob } from '@briddge/core'
*/

import {
  watch as baseWatch,
} from './reactivity/index.js';

import { 
  SchedulerJobFlags, queueJob, queuePostFlushCb,
  currentInstance,
  // type ComponentInternalInstance,
  // isInSSRComponentSetup,
  // setCurrentInstance,
  callWithAsyncErrorHandling 
} from '@briddge/core';
import {
  EMPTY_OBJ,
  extend,
  isFunction,
  // NOOP,
  // isString
} from '@vue/shared';
// import { queuePostRenderEffect } from './renderer'
import { warn } from './reactivity/warning.js';
// import type { ObjectWatchOptionItem } from '@briddge/core'
// import { useSSRContext } from './helpers/useSsrContext'


/**
 * Simple effect.
 *
 * @param {WatchEffect} effect
 * @param {?WatchEffectOptions} [options]
 * @returns {WatchHandle}
 */
export function watchEffect(effect, options) {
  return doWatch(effect, null, options);
}


/**
 *
 * @param {WatchEffect} effect
 * @param {?DebuggerOptions} [options]
 * @returns {WatchHandle}
 */
export function watchPostEffect(effect, options) {
  return doWatch(
    effect,
    null,
    !!(process.env.NODE_ENV !== 'production') ? extend({}, options, { flush: 'post' }) : { flush: 'post' },
  );
}


/**
 *
 * @param {WatchEffect} effect
 * @param {?DebuggerOptions} [options]
 * @returns {WatchHandle}
 */
export function watchSyncEffect(effect, options) {
  return doWatch(
    effect,
    null,
    !!(process.env.NODE_ENV !== 'production') ? extend({}, options, { flush: 'sync' }) : { flush: 'sync' },
  );
}


/**
 *
 * @param {WatchEffect} effect
 * @param {?DebuggerOptions} [options]
 * @returns {WatchHandle}
 */
export function watchInsertionEffect(effect, options) {
  return doWatch(
    effect,
    null,
    !!(process.env.NODE_ENV !== 'production')
      ? extend({}, options, { flush: 'insertion' })
      : { flush: 'insertion' },
  );
}


/**
 *
 * @param {WatchEffect} effect
 * @param {?DebuggerOptions} [options]
 * @returns {WatchHandle}
 */
export function watchLayoutEffect(effect, options) {
  return doWatch(
    effect,
    null,
    !!(process.env.NODE_ENV !== 'production') ? extend({}, options, { flush: 'layout' }) : { flush: 'layout' },
  );
}

/**
 * overload: single source + cb
 *
 * @overload
 * @template T
 * @template {Readonly<boolean>} [Immediate=false]
 * @param {WatchSource<T>} source
 * @param {WatchCallback<T, MaybeUndefined<T, Immediate>>} cb
 * @param {?WatchOptions<Immediate>} [options]
 * @returns {WatchHandle}
 */

/**
 * overload: reactive array or tuple of multiple sources + cb
 *
 * @overload
 * @template {Readonly<MultiWatchSources>} T
 * @template {Readonly<boolean>} [Immediate=false]
 * @param {(readonly [...T] | T)} sources
 * @param {[T] extends [ReactiveMarker]
 *     ? WatchCallback<T, MaybeUndefined<T, Immediate>>
 *     : WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>} cb
 * @param {?WatchOptions<Immediate>} [options]
 * @returns {WatchHandle}
 */

/**
 * overload: array of multiple sources + cb
 *
 * @overload
 * @template {MultiWatchSources} T
 * @template {Readonly<boolean>} [Immediate=false]
 * @param {[...T]} sources
 * @param {WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>} cb
 * @param {?WatchOptions<Immediate>} [options]
 * @returns {WatchHandle}
 */

/**
 * overload: watching reactive object w/ cb
 *
 * @overload
 * @template {object} T
 * @template {Readonly<boolean>} [Immediate=false]
 * @param {T} source
 * @param {WatchCallback<T, MaybeUndefined<T, Immediate>>} cb
 * @param {?WatchOptions<Immediate>} [options]
 * @returns {WatchHandle}
 */

/**
 * implementation
 *
 * @template [T=any]
 * @template {Readonly<boolean>} [Immediate=false]
 * @param {(T | WatchSource<T>)} source
 * @param {*} cb
 * @param {?WatchOptions<Immediate>} [options]
 * @returns {WatchHandle}
 */
export function watch(
  source,
  cb,
  options,
) {
  if (!!(process.env.NODE_ENV !== 'production') && !isFunction(cb)) {
    warn(
      `\`watch(fn, options?)\` signature has been moved to a separate API. ` +
      `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` +
      `supports \`watch(source, cb, options?) signature.`,
    );
  }
  return doWatch(source, cb, options);
}


/**
 *
 * @param {(WatchSource | WatchSource[] | WatchEffect | object)} source
 * @param {(WatchCallback | null)} cb
 * @param {WatchOptions} [options=EMPTY_OBJ]
 * @returns {WatchHandle}
 */
function doWatch(
  source,
  cb,
  options = EMPTY_OBJ,
) {
  const { immediate, deep, flush, once } = options;

  if (!!(process.env.NODE_ENV !== 'production') && !cb) {
    if (immediate !== undefined) {
      warn(
        `watch() "immediate" option is only respected when using the ` + `watch(source, callback, options?) signature.`,
      );
    }
    if (deep !== undefined) {
      warn(`watch() "deep" option is only respected when using the ` + `watch(source, callback, options?) signature.`);
    }
    if (once !== undefined) {
      warn(`watch() "once" option is only respected when using the ` + `watch(source, callback, options?) signature.`);
    }
  }


  /**
   * @type {BaseWatchOptions}
   */
  const baseWatchOptions = extend({}, options);

  if (!!(process.env.NODE_ENV !== 'production')) baseWatchOptions.onWarn = warn;

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

  const instance = currentInstance;
  baseWatchOptions.call = (fn, type, args) => callWithAsyncErrorHandling(fn, instance, type, args);

  // scheduler
  let isPre = false;
  switch (flush) {
    case 'post':
    case 'layout':
    case 'insertion':
      baseWatchOptions.scheduler = (job) => {
        const jobs = queuePostFlushCb(job);
        const instance = job.i;
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
          const instance = job.i;
          const jobIndex = queueJob(job);
          if (instance) instance.queueEffect('pre', jobIndex);
        }
      };
      break;
  }

  baseWatchOptions.augmentJob = /**
   * Description placeholder
   *
   * @param {SchedulerJob} job
   */
    (job) => {
      // important: mark the job as a watcher callback so that scheduler knows
      // it is allowed to self-trigger (#1727)
      if (cb) {
        job.flags |= SchedulerJobFlags.ALLOW_RECURSE;
      }
      if (isPre) {
        job.flags |= SchedulerJobFlags.PRE;
        if (instance) {
          job.id = instance.uid;
          job.i = instance;
        }
      }
    };

  const watchHandle = baseWatch(source, cb, baseWatchOptions);

  // if (__SSR__ && ssrCleanup) ssrCleanup.push(watchHandle)
  return watchHandle;
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


/**
 *
 * @param {*} ctx
 * @param {string} path
 * @returns {() => any}
 */
export function createPathGetter(ctx, path) {
  const segments = path.split('.');
  return () => {
    let cur = ctx;
    for (let i = 0; i < segments.length && cur; i++) {
      cur = cur[segments[i]];
    }
    return cur;
  };
}
