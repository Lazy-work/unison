/** @import { UnisonPlugin, ComponentInternalInstance } from '@unisonjs/core' */
/** @import { Reactive, Ref } from './reactivity/index.js' */
import { usePlugin, UnisonPlugin } from '@unisonjs/core';
import { isReactive, isReadonly, isRef } from './reactivity/index';


export class FastRefreshStoragePlugin implements UnisonPlugin {

  #data = new Map<string, any>();

  #keys: string[] = [];

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
   * @param key - The unique identifier for the signal.
   * @param signal - The reactive or ref signal to recover.
   */
  recover(key: string, signal: Reactive<any> | Ref<any>) {
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

  onInstanceCreated(instance: ComponentInternalInstance) {}

  onInstanceDisposed(instance: ComponentInternalInstance) {}
}

usePlugin(FastRefreshStoragePlugin);
