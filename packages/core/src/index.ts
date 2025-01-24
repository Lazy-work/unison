export { $unison, createReactHook, usePlugin, type SetupComponent } from './management';
export { type EventType } from './context';
export { useUnison } from './use-unison';

export { 
  HookManager, 
  toUnisonHook, 
  BaseSignal, 
  type UnisonHookOptions, 
  type HookOptions 
} from './plugins/hook-manager/index';

export type * from './plugins/index';

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
  batch,
  stop,
  onEffectCleanup,
  refreshComputed,
  EffectFlags,
} from '#vue-internals/reactivity/effect';

export {
  effectScope,
  EffectScope,
  getCurrentScope,
  onScopeDispose,
} from '#vue-internals/reactivity/effectScope';

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
  getMode,
  getJobAt,
  endFlush,
  SchedulerJobFlags,
} from '#vue-internals/runtime-core/scheduler';

export {
  currentListener,
  createListener,
  getCurrentListener,
  setCurrentListener,
  type Listener
} from './listener'

export { nextTick } from '#vue-internals/runtime-core/scheduler';

export { withAsyncContext } from '#vue-internals/runtime-core/apiSetupHelpers';

export {
  validateComponentName,
} from '#vue-internals/runtime-core/component'
export { validateDirectiveName } from '#vue-internals/runtime-core/directives'
export { ErrorCodes, callWithAsyncErrorHandling } from '#vue-internals/runtime-core/errorHandling'
export type { ComponentOptions } from '#vue-internals/runtime-core/componentOptions'
export type { Directive } from '#vue-internals/runtime-core/directives'
export {
  type Component,
  type ConcreteComponent,
  type Data,
  currentInstance
} from '#vue-internals/runtime-core/component'
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
export { type VNode } from '#vue-internals/runtime-core/vnode'
export type { NormalizedPropsOptions } from '#vue-internals/runtime-core/componentProps'
export type { ObjectEmitsOptions } from '#vue-internals/runtime-core/componentEmits'
export type { DefineComponent } from '#vue-internals/runtime-core/apiDefineComponent'

import Context from './context';
import { getCurrentInstance as getCurrentInstanceImpl, setCurrentInstance as setCurrentInstanceImpl } from '#vue-internals/runtime-core/component';
export type ComponentInternalInstance = Context;

export const getCurrentInstance: () => ComponentInternalInstance | null = getCurrentInstanceImpl as any
export const setCurrentInstance: (instance: ComponentInternalInstance) => () => void = setCurrentInstanceImpl as any
export * from './lifecycle';
export * from './conditional/index';
