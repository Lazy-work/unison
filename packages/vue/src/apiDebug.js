/** @import { BridgePlugin, ComponentInternalInstance } from '@bridge/core' */
/** @import { Reactive, Ref } from '#vue/reactivity' */
import { usePlugin } from '@bridge/core';
import { isReactive, isReadonly, isRef } from '#vue/reactivity';

/**
 * @implements {BridgePlugin}
 * A plugin for managing fast refresh storage with reactive and ref signals.
 */
export class FastRefreshStoragePlugin {
  /**
   * @private
   * @type {Map<string, any>}
   */
  #data = new Map();

  /**
   * @private
   * @type {string[]}
   */
  #keys = [];

  /**
   * Cleans up the storage by removing data not included in the current keys.
   */
  start() {
    for (const [key] of this.#data) {
      if (!this.#keys.includes(key)) {
        this.#data.delete(key);
      }
    }
    this.#keys = [];
  }

  /**
   * Recovers a reactive or ref signal by restoring its state from the stored data.
   * @param {string} key - The unique identifier for the signal.
   * @param {Reactive<any> | Ref<any>} signal - The reactive or ref signal to recover.
   */
  recover(key, signal) {
    if (isRef(signal) || isReactive(signal)) {
      if (this.#data.has(key)) {
        const currentValue = this.#data.get(key);

        if (isRef(signal) && isRef(currentValue) && !isReadonly(signal)) {
          signal.value = currentValue.value;
        }

        if (isReactive(signal) && isReactive(currentValue) && !isReadonly(signal)) {
          for (const [propKey, value] of Object.entries(currentValue)) {
            signal[propKey] = value;
          }
        }
      }
      this.#data.set(key, signal);
      this.#keys.push(key);
    }
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

// Register the FastRefreshStoragePlugin
usePlugin(FastRefreshStoragePlugin);
