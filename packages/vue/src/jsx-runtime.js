/** @import { BridgePlugin, ComponentInternalInstance } from '@bridge/core' */
/** @import { ComputedRefImpl } from '#vue-internals/reactivity/computed' */
import { usePlugin, getCurrentInstance } from '@bridge/core';
import { unref } from './index';
import { computed } from '#vue-internals/reactivity/computed';


/**
 * @typedef {() => React.ReactNode} Callback
 * A callback function that returns a React node.
 */

/**
 * @implements {BridgePlugin}
 * A cache for storing and retrieving elements associated with callback keys.
 */
class ElementCache {
  /**
   * @private
   * @type {Map<Callback, React.ReactNode | ComputedRefImpl<React.ReactNode>>}
   */
  #cache = new Map();

  /**
   * Retrieves an element from the cache by its key.
   * @param {Callback} key - The key associated with the element.
   * @returns {React.ReactNode | ComputedRefImpl<React.ReactNode> | undefined} The cached element or undefined if not found.
   */
  getElement(key) {
    return this.#cache.get(key);
  }

  /**
   * Stores an element in the cache with its associated key.
   * @param {Callback} key - The key to associate with the element.
   * @param {React.ReactNode | ComputedRefImpl<React.ReactNode>} element - The element to cache.
   * @returns {React.ReactNode | ComputedRefImpl<React.ReactNode>} The cached element.
   */
  setElement(key, element) {
    this.#cache.set(key, element);
    return element;
  }

  /**
   * Hook triggered when a component instance is created.
   * @param {ComponentInternalInstance} instance - The component instance being created.
   */
  onInstanceCreated(instance) {}

  /**
   * Hook triggered when a component instance is disposed.
   * @param {ComponentInternalInstance} instance - The component instance being disposed.
   */
  onInstanceDisposed(instance) {}
}

// Register the ElementCache plugin
usePlugin(ElementCache);

/**
 * Resolves and optionally caches a React node using a callback function.
 * @param {Callback} callback - The callback function that produces the React node.
 * @returns {React.ReactNode} The resolved React node.
 */
export function rsx(callback) {
  const cache = getCurrentInstance()?.getPlugin(ElementCache);
  if (!cache) return callback();

  let element = cache.getElement(callback);
  if (!element) {
    /** @type {ComputedRefImpl<React.ReactNode>} */
    const ref = computed(callback);
    const result = ref.value;

    if (ref.dep.subs) {
      element = cache.setElement(callback, ref);
    } else {
      element = cache.setElement(callback, result);
    }
  }

  return unref(element);
}
