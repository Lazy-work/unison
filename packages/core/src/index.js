export { $bridge, createReactHook, usePlugin } from './management.js';
export { useBridge } from './use-briddge.js';

export * from './plugins/hook-manager/index.js';

export { ErrorCodes, callWithAsyncErrorHandling } from '#vue-internals/runtime-core/errorHandling.js'
export {
  effect,
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
} from '#vue-internals/reactivity/effect.js';

export {
  effectScope,
  EffectScope,
  getCurrentScope,
  onScopeDispose,
} from '#vue-internals/reactivity/effectScope.js';

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
} from '#vue-internals/reactivity/dep.js';

export {
  queueJob,
  queuePostFlushCb,
  flushJobsUntil,
  flushPostJobsUntil,
  flushPreFlushCbs,
  flushPostFlushCbs,
  switchToAuto,
  switchToManual,
  getMode,
  toggleMode,
  getJobAt,
  endFlush,
  SchedulerJobFlags,
} from '#vue-internals/runtime-core/scheduler.js';

export {
  currentListener,
  createListener,
  getCurrentListener,
  setCurrentListener
} from './listener.js'

export { nextTick } from '#vue-internals/runtime-core/scheduler.js';

export { withAsyncContext } from '#vue-internals/runtime-core/apiSetupHelpers.js';

export { getCurrentInstance, setCurrentInstance, currentInstance } from '#vue-internals/runtime-core/component.js';

export {
  validateComponentName,
} from '#vue-internals/runtime-core/component.js'
export { validateDirectiveName } from '#vue-internals/runtime-core/directives.js'

export * from './lifecycle.js';
export * from './conditional/index.js';

function define(globals) {
  for (const [key, value] of Object.entries(globals)) {
    globalThis[key] = value;
  }
}
