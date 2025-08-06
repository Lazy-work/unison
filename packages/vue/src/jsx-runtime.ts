import { isFastRefresh, usePlugin, getCurrentInstance, type UnisonPlugin, type ComponentInternalInstance } from '@unisonjs/core';
import { unref } from './index';
import { computed, type ComputedRefImpl } from './reactivity/computed';

type Callback = () => React.ReactNode;


class ElementCache implements UnisonPlugin {
  onInstanceFastRefresh(instance: ComponentInternalInstance): void {}
  #cache = new Map<Callback, React.ReactNode | ComputedRefImpl<React.ReactNode>>();

  /**
   * Retrieves an element from the cache by its key.
   * @param key - The key associated with the element.
   * @returns The cached element or undefined if not found.
   */
  getElement(key: Callback) {
    return this.#cache.get(key);
  }

  setElement(key: Callback, element: React.ReactNode | ComputedRefImpl<React.ReactNode>) {
    this.#cache.set(key, element);
    return element;
  }

  onInstanceCreated(instance: ComponentInternalInstance) {}

  onInstanceDisposed(instance: ComponentInternalInstance) {}
}

usePlugin(ElementCache);

/**
 * Resolves and optionally caches a React node using a callback function.
 * @param callback - The callback function that produces the React node.
 * @returns The resolved React node.
 */
export function rsx(callback: Callback) {
  const cache = getCurrentInstance()?.getPlugin(ElementCache);
  if (!cache) return callback();

  let element = cache.getElement(callback);
  if (!element || isFastRefresh()) {
    const ref: ComputedRefImpl<React.ReactNode> = computed(callback) as unknown as  ComputedRefImpl<React.ReactNode>;
    const result = ref.value;

    if (ref.dep.subs) {
      element = cache.setElement(callback, ref);
    } else {
      element = cache.setElement(callback, result);
    }
  }

  return unref(element);
}
