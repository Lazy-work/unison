import {
  Dep,
} from '@unisonjs/core';
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from '../reactivity/constants';
import { hasChanged } from '@vue/shared';
import { toRaw } from '../reactivity';
import { toReactive, type ReactiveContextConfig } from './reactive';

export function ref(context: Omit<ReactiveContextConfig, 'isShallow'>, value: any) {
  return new RefImpl(context, value, false);
}

/**
 * @internal
 */
class RefImpl<T = any> {
  #value: T;
  #rawValue: T;
  #context: Omit<ReactiveContextConfig, 'isShallow'>;

  dep: Dep = new Dep();

  public readonly [ReactiveFlags.IS_REF] = true;
  public readonly [ReactiveFlags.IS_SHALLOW]: boolean = false;

  constructor(context: Omit<ReactiveContextConfig, 'isShallow'>, value: T, isShallow: boolean) {
    this.#rawValue = toRaw(value);
    this.#value = toReactive(context, value);
    this.#context = context;
    this[ReactiveFlags.IS_SHALLOW] = isShallow;
  }

  get value() {
    if (__DEV__) {
      this.dep.track({
        target: this,
        type: TrackOpTypes.GET,
        key: 'value',
      });
    } else {
      this.dep.track();
    }
    return this.#value;
  }

  set value(newValue) {
    const oldValue = this.#rawValue;
    if (hasChanged(newValue, oldValue)) {
      this.#rawValue = newValue;
      this.#value = toReactive(this.#context, newValue);
      if (__DEV__) {
        this.dep.trigger({
          target: this,
          type: TriggerOpTypes.SET,
          key: 'value',
          newValue,
          oldValue,
        });
      } else {
        this.dep.trigger();
      }
    }
  }
}
