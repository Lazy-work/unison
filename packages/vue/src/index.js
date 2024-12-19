import { usePlugin } from '@briddge/core';
import { InjectionPlugin } from './apiInject.js';
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
} from '@briddge/core';
/**
 * @internal
 */
export { withAsyncContext } from '@briddge/core';
export { AppProvider } from './app.js';
export { createApp } from './apiCreateApp.js';
usePlugin(InjectionPlugin);
export { inject, provide, hasInjectionContext } from './apiInject.js';
export { FastRefreshStoragePlugin } from './apiDebug.js';
export { toBridgeHook } from './hook-manager/index.js';
export { rsx } from './jsx-runtime.js';
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
export function reactRef(initialValue) {
  function ref(newValue) {
    this.value = newValue;
  }
  ref.value = initialValue;
  return ref;
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
} from './reactivity/index.js';
export { watch, watchEffect, watchPostEffect, watchSyncEffect } from './apiWatch.js';
export { TrackOpTypes, TriggerOpTypes } from './reactivity/index.js';
