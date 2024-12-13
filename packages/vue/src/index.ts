import { usePlugin } from '@bridge/core';
import { InjectionPlugin } from './apiInject';

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
} from './apiCreateApp'

usePlugin(InjectionPlugin);

export { inject, provide, hasInjectionContext, type InjectionKey } from './apiInject';

export { FastRefreshStoragePlugin } from './apiDebug';

export { toBridgeHook } from './hook-manager';

export { rsx } from './jsx-runtime';

export const isVue2 = false;
export const isVue3 = true;
export const version = '3.0.0';

export const Fragment = {};
export const TransitionGroup = {};
export const Transition = {};
export function defineComponent(options: any) {
  throw new Error('Not implemented yet');
}
export function h() {
  throw new Error('Not implemented yet');
}
export function set(target: any, key: any, val: any) {
  if (Array.isArray(target)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return val;
  }
  target[key] = val;
  return val;
}

export function del(target: any, key: any) {
  if (Array.isArray(target)) {
    target.splice(key, 1);
    return;
  }
  delete target[key];
}

export function reactRef<T>(initialValue: T) {
  type ReactRef<T> = { value: T };
  function ref(this: ReactRef<T>, newValue: T) {
    this.value = newValue;
  }
  ref.value = initialValue;
  return ref;
}
export * from './app';

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
} from '@vue/runtime-core';
export {
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect
} from '@vue/runtime-core';

export { TrackOpTypes, TriggerOpTypes } from '@vue/reactivity';

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
} from '@vue/runtime-core';
