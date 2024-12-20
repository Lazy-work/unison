import { nextTick, isReactive, reactive, toRaw, isRef, ref, watchEffect as effect } from '../src/index';
import { $bridge } from '@briddge/core';
import { act, render } from '@testing-library/react';
import React from 'react';

describe('reactivity/reactive/Array', () => {
  test('Array identity methods should be reactive', async () => {
    let obj;
    let arr;

    let index: number;
    const Comp = $bridge(() => {
      obj = {};
      arr = reactive([obj, {}]);
      index = -1;
      effect(() => {
        index = arr.indexOf(obj);
      });
      return () => <div />;
    });

    render(<Comp />);
    expect(index).toBe(0);
    arr.reverse();
    await nextTick();

    expect(index).toBe(1);
  });

  test('delete on Array should not trigger length dependency', async () => {
    let arr = reactive([1, 2, 3]);
    let fn;
    const Comp = $bridge(() => {
      arr = reactive([1, 2, 3]);
      fn = vi.fn();
      effect(() => {
        fn(arr.length);
      });
      return () => <div />;
    });

    render(<Comp />);
    expect(fn).toHaveBeenCalledTimes(1);
    delete arr[1];
    await nextTick();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should track hasOwnProperty call with index', async () => {
    let original;
    let observed;

    let dummy;

    const Comp = $bridge(() => {
      original = [1, 2, 3];
      observed = reactive(original);
      effect(() => {
        dummy = observed.hasOwnProperty(0);
      });
      return () => <div />;
    });

    render(<Comp />);
    expect(dummy).toBe(true);

    delete observed[0];
    await nextTick();

    expect(dummy).toBe(false);
  });

  test('shift on Array should trigger dependency once', async () => {
    let arr;
    let fn;
    const Comp = $bridge(() => {
      arr = reactive([1, 2, 3]);
      fn = vi.fn();
      effect(() => {
        for (let i = 0; i < arr.length; i++) {
          arr[i];
        }
        fn();
      });
      return () => <div />;
    });

    render(<Comp />);
    expect(fn).toHaveBeenCalledTimes(1);
    arr.shift();
    await nextTick();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  //#6018
  test('edge case: avoid trigger effect in deleteProperty when array length-decrease mutation methods called', async () => {
    let arr;
    let fn1;
    let fn2;
    const Comp = $bridge(() => {
      arr = ref([1]);
      fn1 = vi.fn();
      fn2 = vi.fn();
      effect(() => {
        fn1();
        if (arr.value.length > 0) {
          arr.value.slice();
          fn2();
        }
      });
      return () => <div />;
    });

    render(<Comp />);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    arr.value.splice(0);
    await nextTick();

    expect(fn1).toHaveBeenCalledTimes(2);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  test('add existing index on Array should not trigger length dependency', async () => {
    let array;
    let observed;
    let fn;
    const Comp = $bridge(() => {
      array = new Array(3);
      observed = reactive(array);
      fn = vi.fn();
      effect(() => {
        fn(observed.length);
      });
      return () => <div />;
    });

    render(<Comp />);
    expect(fn).toHaveBeenCalledTimes(1);
    observed[1] = 1;
    await nextTick();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('add non-integer prop on Array should not trigger length dependency', async () => {
    let array: any[] & { x?: string };
    let observed;
    let fn;

    const Comp = $bridge(() => {
      array = new Array(3);
      observed = reactive(array);
      fn = vi.fn();
      effect(() => {
        fn(observed.length);
      });
      return () => <div />;
    });

    render(<Comp />);
    expect(fn).toHaveBeenCalledTimes(1);
    observed.x = 'x';
    await nextTick();

    expect(fn).toHaveBeenCalledTimes(1);
    observed[-1] = 'x';
    await nextTick();

    expect(fn).toHaveBeenCalledTimes(1);
    observed[NaN] = 'x';
    await nextTick();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  // #2427
  test('track length on for ... in iteration', async () => {
    let array;
    let length;

    const Comp = $bridge(() => {
      array = reactive([1]);
      length = '';
      effect(() => {
        length = '';
        for (const key in array) {
          length += key;
        }
      });
      return () => <div />;
    });

    render(<Comp />);
    expect(length).toBe('0');
    array.push(1);
    await nextTick();

    expect(length).toBe('01');
  });
});
