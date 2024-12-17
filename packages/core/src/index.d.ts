export { $bridge, createReactHook, usePlugin } from './management';
export { SetupComponent, EventTypes } from './types';
export { useBridge } from './use-bridge';

export * from './plugins/hook-manager';

export type * from './plugins';

export type {
  DebuggerEvent,
  DebuggerEventExtraInfo,
  DebuggerOptions,
  EffectScheduler,
  ReactiveEffectOptions,
  ReactiveEffectRunner,
  Subscriber,
} from '#vue-internals/reactivity/effect';

export type { SchedulerJob, SchedulerJobs } from '#vue-internals/runtime-core/scheduler';

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

import Context from './context';
export type ComponentInternalInstance = Context;
export declare function getCurrentInstance(): ComponentInternalInstance | null;
export declare function setCurrentInstance(instance: ComponentInternalInstance): void;

export * from './lifecycle';
export * from './conditional';
