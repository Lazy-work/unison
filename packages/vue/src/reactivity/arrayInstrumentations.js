/** @import { ArrayMethods } from './types.js' */
import { TrackOpTypes } from './constants.js';
import { endBatch, pauseTracking, resetTracking, startBatch, ARRAY_ITERATE_KEY, track } from '@briddge/core';
import { isProxy, isShallow, toRaw, toReactive } from './reactive.js';
import { isArray } from '@vue/shared';

/**
 * Track array iteration and return:
 * - if input is reactive: a cloned raw array with reactive values
 * - if input is non-reactive or shallowReactive: the original raw array
 *
 * @template T
 * @param {T[]} array
 * @returns {T[]}
 */
export function reactiveReadArray(array) {
  const raw = toRaw(array);
  if (raw === array) return raw;
  track(raw, TrackOpTypes.ITERATE, ARRAY_ITERATE_KEY);
  return isShallow(array) ? raw : raw.map(toReactive);
}

/**
 * Track array iteration and return raw array
 *
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function shallowReadArray(arr) {
  track((arr = toRaw(arr)), TrackOpTypes.ITERATE, ARRAY_ITERATE_KEY);
  return arr;
}

/**
 * @type {Record<string | symbol, Function>}
 */
export const arrayInstrumentations = {
  __proto__: null,

  [Symbol.iterator]() {
    return iterator(this, Symbol.iterator, toReactive);
  },

  /**
   *
   * @param {...unknown[]} args
   * @returns {*}
   */
  concat(...args) {
    return reactiveReadArray(this).concat(...args.map((x) => (isArray(x) ? reactiveReadArray(x) : x)));
  },

  entries() {
    return iterator(this, 'entries', (value) => {
      value[1] = toReactive(value[1]);
      return value;
    });
  },

  /**
   *
   * @param {(item: unknown, index: number, array: unknown[]) => unknown} fn
   * @param {?unknown} [thisArg]
   * @returns {unknown, thisArg ...args: {}) => any}
   */
  every(fn, thisArg) {
    return apply(this, 'every', fn, thisArg, undefined, arguments);
  },

  /**
   *
   * @param {(item: unknown, index: number, array: unknown[]) => unknown} fn
   * @param {?unknown} [thisArg]
   * @returns {unknown, thisArg?: unknown) => any}
   */
  filter(fn, thisArg) {
    return apply(this, 'filter', fn, thisArg, (v) => v.map(toReactive), arguments);
  },

  /**
   *
   * @param {(item: unknown, index: number, array: unknown[]) => boolean} fn
   * @param {?unknown} [thisArg]
   * @returns {boolean, thisArg?: unknown) => any}
   */
  find(fn, thisArg) {
    return apply(this, 'find', fn, thisArg, toReactive, arguments);
  },

  /**
   *
   * @param {(item: unknown, index: number, array: unknown[]) => boolean} fn
   * @param {?unknown} [thisArg]
   * @returns {boolean, thisArg?: unknown) => any}
   */
  findIndex(fn, thisArg) {
    return apply(this, 'findIndex', fn, thisArg, undefined, arguments);
  },

  /**
   *
   * @param {(item: unknown, index: number, array: unknown[]) => boolean} fn
   * @param {?unknown} [thisArg]
   * @returns {boolean, thisArg?: unknown) => any}
   */
  findLast(fn, thisArg) {
    return apply(this, 'findLast', fn, thisArg, toReactive, arguments);
  },

  findLastIndex(fn, thisArg) {
    return apply(this, 'findLastIndex', fn, thisArg, undefined, arguments);
  },

  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  /**
   *
   * @param {(item: unknown, index: number, array: unknown[]) => unknown} fn
   * @param {?unknown} [thisArg]
   * @returns {unknown, thisArg?: unknown) => any}
   */
  forEach(fn, thisArg) {
    return apply(this, 'forEach', fn, thisArg, undefined, arguments);
  },

  /**
   *
   * @param {...unknown[]} args
   * @returns {*}
   */
  includes(...args) {
    return searchProxy(this, 'includes', args);
  },

  /**
   *
   * @param {...unknown[]} args
   * @returns {*}
   */
  indexOf(...args) {
    return searchProxy(this, 'indexOf', args);
  },

  /**
   *
   * @param {?string} [separator]
   * @returns {*}
   */
  join(separator) {
    return reactiveReadArray(this).join(separator);
  },

  // keys() iterator only reads `length`, no optimisation required
  /**
   *
   * @param {...unknown[]} args
   * @returns {*}
   */
  lastIndexOf(...args) {
    return searchProxy(this, 'lastIndexOf', args);
  },

  /**
   *
   * @param {(item: unknown, index: number, array: unknown[]) => unknown} fn
   * @param {?unknown} [thisArg]
   * @returns {unknown, thisArg?: unknown) => any}
   */
  map(fn, thisArg) {
    return apply(this, 'map', fn, thisArg, undefined, arguments);
  },

  /**
   *
   * @returns {*}
   */
  pop() {
    return noTracking(this, 'pop');
  },

  /**
   *
   * @param {...unknown[]} args
   * @returns {*}
   */
  push(...args) {
    return noTracking(this, 'push', args);
  },

  /**
   * Description placeholder
   *
   * @param {(
   *       acc: unknown,
   *       item: unknown,
   *       index: number,
   *       array: unknown[],
   *     ) => unknown} fn
   * @param {...unknown[]} args
   * @returns
   */
  reduce(fn, ...args) {
    return reduce(this, 'reduce', fn, args);
  },

  /**
   *
   * @param {(
   *       acc: unknown,
   *       item: unknown,
   *       index: number,
   *       array: unknown[],
   *     ) => unknown} fn
   * @param {...unknown[]} args
   * @returns {unknown, ...args: {}) => any}
   */
  reduceRight(fn, ...args) {
    return reduce(this, 'reduceRight', fn, args);
  },

  shift() {
    return noTracking(this, 'shift');
  },

  // slice could use ARRAY_ITERATE but also seems to beg for range tracking

  /**
   *
   * @param {(item: unknown, index: number, array: unknown[]) => unknown} fn
   * @param {?unknown} [thisArg]
   * @returns {unknown, thisArg?: unknown) => any}
   */
  some(fn, thisArg) {
    return apply(this, 'some', fn, thisArg, undefined, arguments);
  },

  splice(...args) {
    return noTracking(this, 'splice', args);
  },

  toReversed() {
    // @ts-expect-error user code may run in es2016+
    return reactiveReadArray(this).toReversed();
  },

  /**
   *
   * @param {?(a: unknown, b: unknown) => number} [comparer]
   * @returns {number) => any}
   */
  toSorted(comparer) {
    // @ts-expect-error user code may run in es2016+
    return reactiveReadArray(this).toSorted(comparer);
  },

  /**
   *
   * @param {...unknown[]} args
   * @returns {*}
   */
  toSpliced(...args) {
    // @ts-expect-error user code may run in es2016+
    return reactiveReadArray(this).toSpliced(...args);
  },

  /**
   * Description placeholder
   *
   * @param {...unknown[]} args
   * @returns {*}
   */
  unshift(...args) {
    return noTracking(this, 'unshift', args);
  },

  values() {
    return iterator(this, 'values', toReactive);
  },
};

/**
 * instrument iterators to take ARRAY_ITERATE dependency
 *
 * @param {unknown[]} self
 * @param {keyof Array<unknown>} method
 * @param {(value: any) => unknown} wrapValue
 * @returns
 */
function iterator(self, method, wrapValue) {
  // note that taking ARRAY_ITERATE dependency here is not strictly equivalent
  // to calling iterate on the proxified array.
  // creating the iterator does not access any array property:
  // it is only when .next() is called that length and indexes are accessed.
  // pushed to the extreme, an iterator could be created in one effect scope,
  // partially iterated in another, then iterated more in yet another.
  // given that JS iterator can only be read once, this doesn't seem like
  // a plausible use-case, so this tracking simplification seems ok.
  const arr = shallowReadArray(self);
  const iter = arr[method]();
  if (arr !== self && !isShallow(self)) {
    iter._next = iter.next;
    iter.next = () => {
      const result = iter._next();
      if (result.value) {
        result.value = wrapValue(result.value);
      }
      return result;
    };
  }
  return iter;
}

const arrayProto = Array.prototype;

// instrument functions that read (potentially) all items
// to take ARRAY_ITERATE dependency

/**
 *
 * @param {unknown[]} self
 * @param {ArrayMethods} method
 * @param {(item: unknown, index: number, array: unknown[]) => unknown} fn
 * @param {?unknown} [thisArg]
 * @param {?(result: any) => unknown} [wrappedRetFn]
 * @param {?IArguments} [args]
 * @returns
 */
function apply(self, method, fn, thisArg, wrappedRetFn, args) {
  const arr = shallowReadArray(self);
  const needsWrap = arr !== self && !isShallow(self);
  // @ts-expect-error our code is limited to es2016 but user code is not
  const methodFn = arr[method];

  // #11759
  // If the method being called is from a user-extended Array, the arguments will be unknown
  // (unknown order and unknown parameter types). In this case, we skip the shallowReadArray
  // handling and directly call apply with self.
  if (methodFn !== arrayProto[method]) {
    const result = methodFn.apply(self, args);
    return needsWrap ? toReactive(result) : result;
  }

  let wrappedFn = fn;
  if (arr !== self) {
    if (needsWrap) {
      wrappedFn = function (item, index) {
        return fn.call(this, toReactive(item), index, self);
      };
    } else if (fn.length > 2) {
      wrappedFn = function (item, index) {
        return fn.call(this, item, index, self);
      };
    }
  }
  const result = methodFn.call(arr, wrappedFn, thisArg);
  return needsWrap && wrappedRetFn ? wrappedRetFn(result) : result;
}

/**
 * instrument reduce and reduceRight to take ARRAY_ITERATE dependency
 *
 * @param {unknown[]} self
 * @param {keyof Array<any>} method
 * @param {(acc: unknown, item: unknown, index: number, array: unknown[]) => unknown} fn
 * @param {unknown[]} args
 * @returns {any}
 */
function reduce(self, method, fn, args) {
  const arr = shallowReadArray(self);
  let wrappedFn = fn;
  if (arr !== self) {
    if (!isShallow(self)) {
      wrappedFn = function (acc, item, index) {
        return fn.call(this, acc, toReactive(item), index, self);
      };
    } else if (fn.length > 3) {
      wrappedFn = function (acc, item, index) {
        return fn.call(this, acc, item, index, self);
      };
    }
  }
  return arr[method](wrappedFn, ...args);
}

/**
 * instrument identity-sensitive methods to account for reactive proxies
 *
 * @param {unknown[]} self
 * @param {keyof Array<any>} method
 * @param {unknown[]} args
 * @returns {*}
 */
function searchProxy(self, method, args) {
  const arr = toRaw(self);
  track(arr, TrackOpTypes.ITERATE, ARRAY_ITERATE_KEY);
  // we run the method using the original args first (which may be reactive)
  const res = arr[method](...args);

  // if that didn't work, run it again using raw values.
  if ((res === -1 || res === false) && isProxy(args[0])) {
    args[0] = toRaw(args[0]);
    return arr[method](...args);
  }

  return res;
}

/**
 * instrument length-altering mutation methods to avoid length being tracked
 * which leads to infinite loops in some cases (#2137)
 *
 * @param {unknown[]} self
 * @param {keyof Array<any>} method
 * @param {unknown[]} [args=[]]
 * @returns {*}
 */
function noTracking(self, method, args = []) {
  pauseTracking();
  startBatch();
  const res = toRaw(self)[method].apply(self, args);
  endBatch();
  resetTracking();
  return res;
}
