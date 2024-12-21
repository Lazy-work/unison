
import type { HookManager } from './index';
import { activeSub, shouldTrack, ReactiveEffect } from '#vue-internals/reactivity/effect'

class HookCallableSignal<Parameters extends any[], ReturnType> {
  #manager: HookManager;
  #effects: Set<ReactiveEffect> = new Set<ReactiveEffect>();
  #hookIndex: number;
  #valueIndex: number;

  constructor(manager: HookManager, hookIndex: number, valueIndex: number) {
    this.#manager = manager;
    this.#hookIndex = hookIndex;
    this.#valueIndex = valueIndex;
  }

  call(...args: Parameters): ReturnType {
    const currentValue = this.#manager.getHookValueAt(this.#hookIndex, this.#valueIndex);

    this.track();

    return currentValue(...args);
  }

  track(): void {
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
