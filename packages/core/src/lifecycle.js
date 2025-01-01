/** @import {ComponentInternalInstance} from './index.js' */
import { LifecycleHooks } from '#vue-internals/runtime-core/enums.js';
import { getCurrentInstance } from '#vue-internals/runtime-core/component.js';

/**
 *
 * @param {ComponentInternalInstance | null} instance
 * @param {LifecycleHooks} type
 * @param {Function} hook
 */
function injectHook(instance, type, hook) {
  if (!instance) return;
  const hooks = instance[type] || [];
  hooks.push(hook);
  instance[type] = hooks;
}

/** @typedef {() => void} Hook */

/**
 *
 * @param {Hook} callback
 */
export function onUpdated(callback) {
  const instance = getCurrentInstance();
  injectHook(instance, LifecycleHooks.UPDATED, callback);
}

/**
 *
 * @param {Hook} callback
 */
export function onBeforeUpdate(callback) {
  const instance = getCurrentInstance();
  injectHook(instance, LifecycleHooks.BEFORE_UPDATE, callback);
}


/**
 *
 * @param {Hook} callback
 */
export function onBeforeMount(callback) {
  const instance = getCurrentInstance();
  injectHook(instance, LifecycleHooks.BEFORE_MOUNT, callback);
}


/**
 *
 * @param {Hook} callback
 */
export function onMounted(callback) {
  const instance = getCurrentInstance();
  injectHook(instance, LifecycleHooks.MOUNTED, callback);
}


/**
 *
 * @param {Hook} callback
 */
export function onBeforeUnmount(callback) {
  throw new Error('Not implemented yet');
}


/**
 *
 * @param {Hook} callback
 */
export function onUnmounted(callback) {
  const instance = getCurrentInstance();
  injectHook(instance, LifecycleHooks.UNMOUNTED, callback);
}
