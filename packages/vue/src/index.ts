export {
  $unison,
  createReactHook,
  useUnison,
  $if,
  $match,
  v,
  nextTick,
  getCurrentInstance,
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
} from '@unisonjs/core';
/**
 * @internal
 */
export { withAsyncContext } from '@unisonjs/core';
export { AppProvider } from './app';
export { createApp } from './apiCreateApp';

export type {
  App,
  AppConfig,
  AppContext,
  Plugin,
  ObjectPlugin,
  FunctionPlugin,
  CreateAppFunction,
  OptionMergeFunction
} from './apiCreateApp'

export { inject, provide, hasInjectionContext, type InjectionKey } from './apiInject';
export { FastRefreshStoragePlugin } from './apiDebug';
export { toUnisonHook } from './hook-manager/index';
export { rsx } from './jsx-runtime';
export const isVue2 = false;
export const isVue3 = true;
export const version = '3.0.0';
export const Fragment = {};
export const TransitionGroup = {};
export const Transition = {};
export function defineComponent(options) {
  throw new Error('Not implemented yet');
}
export function h() {
  throw new Error('Not implemented yet');
}
export function set(target, key, val) {
  if (Array.isArray(target)) {
    target.length = Math.max(target.length, key);
    target.splice(key, 1, val);
    return val;
  }
  target[key] = val;
  return val;
}
export function del(target, key) {
  if (Array.isArray(target)) {
    target.splice(key, 1);
    return;
  }
  delete target[key];
}
export function reactRef<T>(initialValue: T) {
  const ref = (newValue: T) => {
    ref.value = newValue;
  }
  ref.value = initialValue
  Object.defineProperty(ref, 'current', {
    get() {
      return ref.value;
    },
    set(value) {
      ref.value = value;
    }
  })
  return ref as typeof ref & { current: T };
}
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
} from './reactivity/index';
export { watch, watchEffect, watchPostEffect, watchSyncEffect, type MultiWatchSources } from './apiWatch';
export { TrackOpTypes, TriggerOpTypes } from './reactivity/index';

export type {
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
} from './reactivity/index';
