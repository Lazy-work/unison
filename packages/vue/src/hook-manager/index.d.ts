import { ToRef } from '../reactivity/ref';
interface UnisonHookOptions {
  paths?: any | ((...args: any[]) => any);
  shallow?: boolean;
}

type AnyFunction = (...args: any[]) => any;
type ToRefs<T> = T extends object ? { [P in keyof T]: T[P] extends Function ? T[P] : ToRef<T[P]> } : T;

export declare function toUnisonHook<T extends AnyFunction>(
  hook: T,
  shallow: UnisonHookOptions & { shallow: true },
): (...args: Parameters<T>) => ToRef<ReturnType<T>> ;
export declare function toUnisonHook<T extends AnyFunction>(
  hook: T,
  options?: UnisonHookOptions & { shallow: false },
): (...args: Parameters<T>) => ToRefs<ReturnType<T>>;
