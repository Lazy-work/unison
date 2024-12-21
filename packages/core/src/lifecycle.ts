import { LifecycleHooks } from '#vue-internals/runtime-core/enums';
import { getCurrentInstance, ComponentInternalInstance } from './index';

export function hasInjectionContext() {
  return !!getCurrentInstance();
}

function injectHook(instance: ComponentInternalInstance | null, type: LifecycleHooks, hook: Function) {
  if (!instance) return;
  const hooks: any[] = instance[type] || [];
  hooks.push(hook);
  instance[type] = hooks;
}

export function onUpdated(callback: () => void) {
  const instance = getCurrentInstance();
  injectHook(instance, LifecycleHooks.UPDATED, callback);
}
export function onBeforeUpdate(callback: () => void) {
  const instance = getCurrentInstance();
  injectHook(instance, LifecycleHooks.BEFORE_UPDATE, callback);
}

export function onBeforeMount(callback: () => void) {
  const instance = getCurrentInstance();
  injectHook(instance, LifecycleHooks.BEFORE_MOUNT, callback);
}

export function onMounted(callback: () => void) {
  const instance = getCurrentInstance();
  injectHook(instance, LifecycleHooks.MOUNTED, callback);
}

export function onBeforeUnmount(callback: () => void) {
  throw new Error('Not implemented yet');
}

export function onUnmounted(callback: () => void) {
  const instance = getCurrentInstance();
  injectHook(instance, LifecycleHooks.UNMOUNTED, callback);
}
