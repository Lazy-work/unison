export { $bridge, createReactHook, usePlugin } from './management.js';
export { SetupComponent, EventTypes } from './types.d.ts';
export { useBridge } from './use-bridge.js';

export * from './plugins/hook-manager/index.js';

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
  toggleMode,
  getJobAt,
  endFlush,
  SchedulerJobFlags,
} from '#vue-internals/runtime-core/scheduler.js';

export type {
  Listener
} from './types'
export {
  currentListener,
  createListener,
  getCurrentListener,
  setCurrentListener
} from './listener.js'

export { nextTick } from '#vue-internals/runtime-core/scheduler.js';

export { withAsyncContext } from '#vue-internals/runtime-core/apiSetupHelpers.js';


export {
  validateComponentName,
} from '#vue-internals/runtime-core/component.js'
export { validateDirectiveName } from '#vue-internals/runtime-core/directives.js'
export { ErrorCodes, callWithAsyncErrorHandling } from '#vue-internals/runtime-core/errorHandling.js'
export type { ComponentOptions } from '#vue-internals/runtime-core/componentOptions'
export type { Directive } from '#vue-internals/runtime-core/directives'
export {
    type Component,
    type ComponentInternalInstance,
    type ConcreteComponent,
    type Data
} from '#vue-internals/runtime-core/component.js'
export type {
    MergedComponentOptions,
    RuntimeCompilerOptions,
} from '#vue-internals/runtime-core/componentOptions'
export type {
    ComponentCustomProperties,
    ComponentPublicInstance,
} from '#vue-internals/runtime-core/componentPublicInstance'
export type { ElementNamespace } from '#vue-internals/runtime-core/renderer'
export type { InjectionKey } from '#vue-internals/runtime-core/apiInject'
export { type VNode } from '#vue-internals/runtime-core/vnode.js'
export type { NormalizedPropsOptions } from '#vue-internals/runtime-core/componentProps'
export type { ObjectEmitsOptions } from '#vue-internals/runtime-core/componentEmits'
export type { DefineComponent } from '#vue-internals/runtime-core/apiDefineComponent'


import Context from './context.js';
export type ComponentInternalInstance = Context;
export const currentInstance: ComponentInternalInstance;
export declare function getCurrentInstance(): ComponentInternalInstance | null;
export declare function setCurrentInstance(instance: ComponentInternalInstance): () => void;

export * from './lifecycle.js';
export * from './conditional/index.js';
