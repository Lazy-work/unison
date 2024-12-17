export {
  $bridge,
  createReactHook,
  useBridge,
  $if,
  $switch,
  v,
  nextTick,
  getCurrentInstance,
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
} from '@bridge/core';

/**
 * @internal
 */
export {
  withAsyncContext
} from '@bridge/core';

export {
  AppProvider,
} from './app';
export { createApp } from './apiCreateApp'
export type {
  App,
  AppConfig,
  AppContext,
  Plugin,
  ObjectPlugin,
  FunctionPlugin,
  CreateAppFunction,
  OptionMergeFunction,
} from './types'
export { inject, provide, hasInjectionContext, type InjectionKey } from './apiInject';
export { FastRefreshStoragePlugin } from './apiDebug';
export { toBridgeHook } from './hook-manager';
export { rsx } from './jsx-runtime';
export declare const isVue2 = false;
export declare const isVue3 = true;
export declare const version = "3.0.0";
export declare const Fragment: {};
export declare const TransitionGroup: {};
export declare const Transition: {};
export declare function defineComponent(options: any): void;
export declare function h(): void;
export declare function set(target: any, key: any, val: any): any;
export declare function del(target: any, key: any): void;
export declare function reactRef<T>(initialValue: T): {
  (this: {
    value: T;
  }, newValue: T): void;
  value: T;
};
export {
  // core
  reactive,
  ref,
  computed,
  readonly,
  // utilities
  unref,
  proxyRefs,
  isRef,
  toRef,
  toValue,
  toRefs,
  isProxy,
  isReactive,
  isReadonly,
  isShallow,
  // advanced
  customRef,
  triggerRef,
  shallowRef,
  shallowReactive,
  shallowReadonly,
  markRaw,
  toRaw,
  // effect
  effect,
  stop,
  getCurrentWatcher,
  onWatcherCleanup,
  ReactiveEffect,
  // effect scope
  effectScope,
  EffectScope,
  getCurrentScope,
  onScopeDispose,
} from '#vue/runtime-core';
export {
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect
} from '#vue/runtime-core';

export { TrackOpTypes, TriggerOpTypes } from '#vue/reactivity';

export type {
  MultiWatchSources,
  WatchEffect,
  WatchOptions,
  WatchCallback,
  WatchSource,
  WatchHandle,
  WatchStopHandle,
  Ref,
  MaybeRef,
  MaybeRefOrGetter,
  ToRef,
  ToRefs,
  UnwrapRef,
  ShallowRef,
  ShallowUnwrapRef,
  CustomRefFactory,
  ReactiveFlags,
  DeepReadonly,
  ShallowReactive,
  UnwrapNestedRefs,
  ComputedRef,
  WritableComputedRef,
  WritableComputedOptions,
  ComputedGetter,
  ComputedSetter,
  ReactiveEffectRunner,
  ReactiveEffectOptions,
  EffectScheduler,
  DebuggerOptions,
  DebuggerEvent,
  DebuggerEventExtraInfo,
  Raw,
  Reactive,
} from '#vue/runtime-core';
