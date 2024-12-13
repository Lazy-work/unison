import { useEffect, useState } from 'react';
import { createListener, setCurrentListener } from '@vue-internals/reactivity/reactive';
import { initInstance } from './management';
import { setCurrentInstance } from './index';

class DisposeManager {
  #queue: Function[] = [];
  #isFlushPending = false;
  #isFlushing = false;

  flushJobs() {
    this.#isFlushPending = true;
    this.#isFlushing = false;
    for (let i = this.#queue.length - 1; i >= 0; i--) {
      this.#queue[i]();
      this.#queue.length--;
    }
  }

  queueFlush() {
    if (!this.#isFlushing && !this.#isFlushPending) {
      queueMicrotask(() => this.flushJobs());
      this.#isFlushPending = true;
    }
  }

  queueJob(dispose: Function) {
    this.#queue.push(dispose);
    this.queueFlush();
  }
}

const listenerDisposer = new DisposeManager();
const instanceDisposer = new DisposeManager();

export function useBridge() {
  const [listener] = useState(createListener);
  const unsetListener = setCurrentListener(listener);
  listenerDisposer.queueJob(unsetListener);
  const [state, setState] = useState(false);
  listener.trigger = () => setState(!state);

  const [instance] = useState(initInstance);
  const unsetInstance = setCurrentInstance(instance);
  instanceDisposer.queueJob(unsetInstance);
  instance.init();
  instance.setupState();
  instance.runEffects();

  useEffect(() => () => {
    if (listener.cleanups) {
      for (const cleanups of listener.cleanups) {
        cleanups();
      }
    }
  })
}
