import { ToRef } from '@unisonjs/vue';
import { UnisonHookOptions } from '@unisonjs/core';

type AnyFunction = (...args: any[]) => any;
type ToRefs<T> = T extends object ? { [P in keyof T]: T[P] extends Function ? T[P] : ToRef<T[P]> } : T;

export declare function toUnisonHook<T extends AnyFunction, O extends UnisonHookOptions>(
  hook: T,
  options?: O,
): (...args: Parameters<T>) => O extends { shallow: true } ? ToRef<ReturnType<T>> : ToRefs<ReturnType<T>>;
