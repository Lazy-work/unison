
import { activeSub, shouldTrack, ReactiveEffect } from '#vue-internals/reactivity/effect'

class HookCallableSignal {
  #manager;
  #effects = new Set();
  #hookIndex;
  #valueIndex;

  constructor(manager, hookIndex, valueIndex) {
    this.#manager = manager;
    this.#hookIndex = hookIndex;
    this.#valueIndex = valueIndex;
  }

  call(...args) {
    const currentValue = this.#manager.getHookValueAt(this.#hookIndex, this.#valueIndex);

    this.track();

    return currentValue(...args);
  }

  track() {
    if (!(activeSub instanceof ReactiveEffect) || !shouldTrack) {
      return;
    }
    this.#effects.add(activeSub);
  }

  trigger() {
    for (const sub of this.#effects) {
      sub.trigger();
    }
    this.#effects.clear();
  }
}

export default HookCallableSignal;
