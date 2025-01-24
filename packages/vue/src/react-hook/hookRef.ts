import { ReactiveFlags, TrackOpTypes } from '../reactivity/constants';
import { type HookManager, BaseSignal, currentListener, Dep, Listener } from '@unisonjs/core';

class HookRef<T = any> extends BaseSignal<T> {
  /**
   * @internal
   */
  #manager: HookManager
  /**
   * @internal
   */
  #hookIndex: number;
  /**
   * @internal
   */
  #valueIndex: number;

  /**
   * @internal
   */
  dep: Dep = new Dep();
  listeners: Listener[] = [];


  /**
   * @internal
   */
  public readonly [ReactiveFlags.IS_REF] = true;
  /**
   * @internal
   */
  public readonly [ReactiveFlags.IS_SHALLOW]: boolean = false;
  /**
   * @internal
   */
  public readonly [ReactiveFlags.IS_READONLY]: boolean = true;

  constructor(manager: HookManager, hookIndex: number, valueIndex: number) {
    super();
    this.#manager = manager;
    this.#hookIndex = hookIndex;
    this.#valueIndex = valueIndex;
  }

  get value() {
    // append react listener
    if (currentListener) {
      this.listeners.push(currentListener);
    }
    if (__DEV__) {
      this.dep.track({
        target: this,
        type: TrackOpTypes.GET,
        key: 'value',
      });
    } else {
      this.dep.track();
    }
    const currentValue = this.#manager.getHookValueAt(this.#hookIndex, this.#valueIndex);

    return currentValue as T;
  }

  trigger() {
    const {listeners} = this;
    if (listeners) {
      for (const listener of listeners) listener.trigger?.();
      listeners.length = 0;
    }
    this.dep.trigger()
  }
}

export default HookRef;
