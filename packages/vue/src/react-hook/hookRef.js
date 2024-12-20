/** @import { HookManager } from '@briddge/core' */
import { Dep } from '@briddge/core';
import { ReactiveFlags, TrackOpTypes } from '../reactivity/constants.js';

/**
 * @template {any} T
 */
class HookRef {
  /**
   * @internal
   * @type {HookManager}
   */
  #manager;
  /**
   * @internal
   * @type {number}
   */
  #hookIndex;
  /**
   * @internal
   * @type {number}
   */
  #valueIndex;

  /**
   * @internal
   * @type {Dep}
   */
  dep = new Dep();

  /**
   * @internal
   * @readonly
   */
  [ReactiveFlags.IS_REF] = true;
  /**
   * @internal
   * @readonly
   */
  [ReactiveFlags.IS_SHALLOW] = false;
  /**
   * @internal
   * @readonly
   */
  [ReactiveFlags.IS_READONLY] = true;

  /**
   *
   * @param {HookManager} manager
   * @param {number} hookIndex
   * @param {number} valueIndex
   */
  constructor(manager, hookIndex, valueIndex) {
    this.#manager = manager;
    this.#hookIndex = hookIndex;
    this.#valueIndex = valueIndex;
  }

  get value() {
    if (!!(process.env.NODE_ENV !== 'production')) {
      this.dep.track({
        target: this,
        type: TrackOpTypes.GET,
        key: 'value',
      });
    } else {
      this.dep.track();
    }
    /** @type {T} */
    const currentValue = this.#manager.getHookValueAt(this.#hookIndex, this.#valueIndex);

    return currentValue;
  }
}

export default HookRef;
