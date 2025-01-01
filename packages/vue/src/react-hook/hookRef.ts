import { ReactiveFlags, TrackOpTypes } from '../reactivity/constants';
import { type HookManager, currentListener, Dep, Listener } from '@unisonjs/core';

class HookRef<T = any> {
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
}

export default HookRef;
