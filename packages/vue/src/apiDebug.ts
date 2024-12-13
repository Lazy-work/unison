import { BridgePlugin, ComponentInternalInstance, usePlugin } from '@bridge/core';
import { isReactive, isReadonly, isRef, type Reactive, type Ref } from '@vue/reactivity';

export class FastRefreshStoragePlugin implements BridgePlugin {
  #data = new Map<string, any>();
  #keys: string[] = [];
  start() {
    for (const [key] of this.#data) {
      if (!this.#keys.includes(key)) {
        this.#data.delete(key);
      }
    }
    this.#keys = [];
  }
  recover(key: string, signal: Reactive<any> | Ref<any>) {
    if (isRef(signal) || isReactive(signal)) {
      if (this.#data.has(key)) {
        const currentValue = this.#data.get(key);
        if (isRef(signal) && isRef(currentValue) && !isReadonly(signal)) {
          signal.value = currentValue.value;
        }
        if (isReactive(signal) && isReactive(currentValue) && !isReadonly(signal)) {
          for (const [key, value] of Object.entries(currentValue)) {
            signal[key] = value;
          }
        }
      }
      this.#data.set(key, signal);
      this.#keys.push(key);
    }
  }
  onInstanceCreated(instance: ComponentInternalInstance): void {}
  onInstanceDisposed(instance: ComponentInternalInstance): void {}
}

usePlugin(FastRefreshStoragePlugin);
