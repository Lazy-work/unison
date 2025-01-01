// ./use-briddge.js
export declare function useBridge(): void;

// ./management.js
import { BridgePluginClass } from './plugins';
export declare function usePlugin<T extends BridgePluginClass, O extends object>(pluginClass: T, options?: O): void;

type AnyFunction = (...args: any[]) => any;
export declare function createReactHook<T extends AnyFunction>(briddgeHook: T): <P extends Parameters<T>>(...args: P) => ReturnType<T>;

import { CaseParams, SetupComponent } from './types.d.ts';
export declare function $bridge<T extends object>(fn: SetupComponent<T>, name?: string): (props: T) => React.ReactNode;

export * from './plugins/hook-manager/index.js';

// ./lifecycle.js
export declare function onUpdated(callback: () => void): void;
export declare function onBeforeUpdate(callback: () => void): void;
export declare function onBeforeMount(callback: () => void): void;
export declare function onMounted(callback: () => void): void;
export declare function onBeforeUnmount(callback: () => void): void;
export declare function onUnmounted(callback: () => void): void;

// ./conditional
declare class LogicalEvaluation {
  constructor(bool: boolean);
  then<T>(exp: T): this;
  elseif<T>(bool: boolean, exp: T): this;
  else<T>(exp: T): this;
  end(): any;
}

declare class SwitchEvaluation<T> {
  constructor(input: T);
  case(...args: CaseParams<T>): this;
  default(expression?: any): any;
}

export declare function $if(bool: boolean): LogicalEvaluation;
export declare function $switch<T>(input: T): SwitchEvaluation;
export declare function v<T>(value: T): {
  value: T;
};

// ./hook-manager
import type { HookManager } from './index';
declare class HookCallableSignal<Parameters extends any[], ReturnType> {
  #private;
  constructor(manager: HookManager, hookIndex: number, valueIndex: number);
  call(...args: Parameters): ReturnType;
  track(): void;
  trigger(): void;
}
export default HookCallableSignal;

export type * from './plugins';

export type {
  Listener
} from './types'

// ./listener.js
export const currentListener: Listener;
export declare function createListener(): Listener;
export declare function getCurrentListener(): Listener | null;
export declare function setCurrentListener(listener: Listener): () => void;

// ./utils.js
export declare function isReactComponent(): boolean;
export declare function mustBeBridgeComponent(): boolean;

export { SetupComponent, EventTypes } from './types.d.ts';

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
  type SchedulerJob
} from '#vue-internals/runtime-core/scheduler.js';

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

import { Context } from './context.js';
export type ComponentInternalInstance = Context;
export const currentInstance: ComponentInternalInstance;
export declare function getCurrentInstance(): ComponentInternalInstance | null;
export declare function setCurrentInstance(instance: ComponentInternalInstance): () => void;
