export { $bridge, createReactHook, usePlugin } from './management';
export { useBridge } from './use-bridge';

export * from './plugins/hook-manager';

export {
  ReactiveEffect,
  activeSub,
  resetTracking,
  pauseTracking,
  enableTracking,
  shouldTrack,
  startBatch,
  endBatch,
  stop,
  onEffectCleanup,
  refreshComputed,
  EffectFlags,
} from '#vue-internals/reactivity/effect';

export {
  Dep,
  Link,
  track,
  trigger,
  getDepFromReactive,
  globalVersion,
  ARRAY_ITERATE_KEY,
  ITERATE_KEY,
  MAP_KEY_ITERATE_KEY,
} from '#vue-internals/reactivity/dep';

export {
  queueJob,
  queuePostFlushCb,
  flushJobsUntil,
  flushPostJobsUntil,
  flushPreFlushCbs,
  flushPostFlushCbs,
  switchToAuto,
  switchToManual,
  toggleMode,
  getJobAt,
  endFlush,
  SchedulerJobFlags,
} from '#vue-internals/runtime-core/scheduler';

export { nextTick } from '#vue-internals/runtime-core/scheduler';

export { withAsyncContext } from '#vue-internals/runtime-core/apiSetupHelpers';

export { getCurrentInstance, setCurrentInstance } from '#vue-internals/runtime-core/component';

export * from './lifecycle';
export * from './conditional';

function define(globals) {
  for (const [key, value] of Object.entries(globals)) {
    globalThis[key] = value;
  }
}


