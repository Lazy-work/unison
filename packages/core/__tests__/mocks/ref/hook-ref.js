/** @import {HookManager} from "../../../src" */
import { BaseSignal } from "../../../src";
import { activeSub, shouldTrack, ReactiveEffect } from '#vue-internals/reactivity/effect';

/** @template T */
export default class HookRef extends BaseSignal {
  /** @type {Set<ReactiveEffect>} */
  #effects = new Set();
  /** @type {HookManager} */
  #manager;
  /** @type {number} */
  #hookIndex;
  /** @type {number} */
  #valueIndex;

  /**
   * @param {HookManager} manager 
   * @param {number} hookIndex 
   * @param {number} valueIndex 
   */
  constructor(manager, hookIndex, valueIndex) {
    super();
    this.#manager = manager;
    this.#hookIndex = hookIndex;
    this.#valueIndex = valueIndex;
  }

  get value() {
    /** @type {T} */
    const currentValue = this.#manager.getHookValueAt(this.#hookIndex, this.#valueIndex);

    this.track();

    return currentValue;
  }

  /**
   * @internal
   */
  track() {
    if (!(activeSub instanceof ReactiveEffect) || !shouldTrack) {
      return;
    }
    this.#effects.add(activeSub);
  }

  /**
   * @internal
   */
  trigger() {
    for (const sub of this.#effects) {
      sub.trigger();
    }
    this.#effects.clear();
  }
}
