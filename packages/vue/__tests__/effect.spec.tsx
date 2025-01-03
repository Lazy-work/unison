import React from 'react';
import { render } from '@testing-library/react';
import {
  type DebuggerEvent,
  type ReactiveEffectRunner,
  TrackOpTypes,
  TriggerOpTypes,
  watchEffect as effect,
  markRaw,
  reactive,
  readonly,
  shallowReactive,
  stop,
  toRaw,
  computed,
  nextTick,
  ref,
  $unison,
} from '../src/index.js';
import { ITERATE_KEY } from '@unisonjs/core';

describe('reactivity/effect', () => {
  it('should run the passed function once (wrapped by a effect)', async () => {
    const fnSpy = vi.fn(() => {});
    const Comp = $unison(() => {
      effect(fnSpy);
      return () => <div />;
    });
    render(<Comp />);
    await nextTick();

    expect(fnSpy).toHaveBeenCalledTimes(1);
  });

  it('should observe basic properties', async () => {
    let dummy;
    let counter;

    const Comp = $unison(() => {
      counter = reactive({ num: 0 });
      effect(() => (dummy = counter.num));
      return () => <div />;
    });
    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(0);
    counter.num = 7;
    await nextTick();

    expect(dummy).toBe(7);
  });

  it('should observe multiple properties', async () => {
    let dummy;
    let counter;

    const Comp = $unison(() => {
      counter = reactive({ num1: 0, num2: 0 });
      effect(() => (dummy = counter.num1 + counter.num1 + counter.num2));
      return () => <div />;
    });
    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(0);
    counter.num1 = counter.num2 = 7;
    await nextTick();

    expect(dummy).toBe(21);
  });

  it('should handle multiple effects', async () => {
    let dummy1, dummy2;
    let counter;

    const Comp = $unison(() => {
      counter = reactive({ num: 0 });
      effect(() => (dummy1 = counter.num));
      effect(() => (dummy2 = counter.num));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy1).toBe(0);
    expect(dummy2).toBe(0);
    counter.num++;
    await nextTick();

    expect(dummy1).toBe(1);
    expect(dummy2).toBe(1);
  });

  it('should observe nested properties', async () => {
    let dummy;
    let counter;

    const Comp = $unison(() => {
      counter = counter = reactive({ nested: { num: 0 } });
      effect(() => (dummy = counter.nested.num));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(0);
    counter.nested.num = 8;
    await nextTick();

    expect(dummy).toBe(8);
  });

  it('should observe delete operations', async () => {
    let dummy;
    let obj;

    const Comp = $unison(() => {
      obj = reactive<{
        prop?: string;
      }>({ prop: 'value' });
      effect(() => (dummy = obj.prop));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe('value');
    delete obj.prop;
    await nextTick();

    expect(dummy).toBe(undefined);
  });

  it('should observe has operations', async () => {
    let dummy;
    let obj;

    const Comp = $unison(() => {
      obj = reactive<{ prop?: string | number }>({ prop: 'value' });
      effect(() => (dummy = 'prop' in obj));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(true);
    delete obj.prop;
    await nextTick();

    expect(dummy).toBe(false);
    obj.prop = 12;
    await nextTick();

    expect(dummy).toBe(true);
  });

  it('should observe properties on the prototype chain', async () => {
    let dummy;
    let counter;
    let parentCounter;

    const Comp = $unison(() => {
      counter = reactive<{ num?: number }>({ num: 0 });
      parentCounter = reactive({ num: 2 });
      Object.setPrototypeOf(counter, parentCounter);
      effect(() => (dummy = counter.num));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(0);
    delete counter.num;
    await nextTick();

    expect(dummy).toBe(2);
    parentCounter.num = 4;
    await nextTick();

    expect(dummy).toBe(4);
    counter.num = 3;
    await nextTick();

    expect(dummy).toBe(3);
  });

  it('should observe has operations on the prototype chain', async () => {
    let dummy;
    let counter;
    let parentCounter;

    const Comp = $unison(() => {
      counter = reactive<{ num?: number }>({ num: 0 });
      parentCounter = reactive({ num: 2 });
      Object.setPrototypeOf(counter, parentCounter);
      effect(() => (dummy = 'num' in counter));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(true);
    delete counter.num;
    await nextTick();

    expect(dummy).toBe(true);
    delete parentCounter.num;
    await nextTick();

    expect(dummy).toBe(false);
    counter.num = 3;
    await nextTick();

    expect(dummy).toBe(true);
  });

  it('should observe inherited property accessors', async () => {
    let dummy, parentDummy, hiddenValue: any;
    let obj;
    let parent;

    const Comp = $unison(() => {
      obj = reactive<{ prop?: number }>({});
      parent = reactive({
        set prop(value) {
          hiddenValue = value;
        },
        get prop() {
          return hiddenValue;
        },
      });
      Object.setPrototypeOf(obj, parent);

      effect(() => (dummy = obj.prop));
      effect(() => (parentDummy = parent.prop));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(undefined);
    expect(parentDummy).toBe(undefined);
    obj.prop = 4;
    await nextTick();

    expect(dummy).toBe(4);
    // this doesn't work, should it?
    // expect(parentDummy).toBe(4)
    parent.prop = 2;
    await nextTick();

    expect(dummy).toBe(2);
    expect(parentDummy).toBe(2);
  });

  it('should observe function call chains', async () => {
    let dummy;
    let counter;

    const Comp = $unison(() => {
      counter = reactive({ num: 0 });
      effect(() => (dummy = getNum()));

      function getNum() {
        return counter.num;
      }
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(0);
    counter.num = 2;
    await nextTick();

    expect(dummy).toBe(2);
  });

  it('should observe iteration', async () => {
    let dummy;
    let list;

    const Comp = $unison(() => {
      list = reactive(['Hello']);
      effect(() => (dummy = list.join(' ')));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe('Hello');
    list.push('World!');
    await nextTick();

    expect(dummy).toBe('Hello World!');
    list.shift();
    await nextTick();

    expect(dummy).toBe('World!');
  });

  it('should observe implicit array length changes', async () => {
    let dummy;
    let list;

    const Comp = $unison(() => {
      list = reactive(['Hello']);
      effect(() => (dummy = list.join(' ')));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe('Hello');
    list[1] = 'World!';
    await nextTick();

    expect(dummy).toBe('Hello World!');
    list[3] = 'Hello!';
    await nextTick();

    expect(dummy).toBe('Hello World!  Hello!');
  });

  it('should observe sparse array mutations', async () => {
    let dummy;
    let list;

    const Comp = $unison(() => {
      list = reactive<string[]>([]);
      list[1] = 'World!';
      effect(() => (dummy = list.join(' ')));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(' World!');
    list[0] = 'Hello';
    await nextTick();

    expect(dummy).toBe('Hello World!');

    list.pop();
    await nextTick();

    expect(dummy).toBe('Hello');
  });

  it('should observe enumeration', async () => {
    let dummy = 0;
    let numbers;

    const Comp = $unison(() => {
      numbers = reactive<Record<string, number>>({ num1: 3 });
      effect(() => {
        dummy = 0;
        for (const key in numbers) {
          dummy += numbers[key];
        }
      });
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(3);
    numbers.num2 = 4;
    await nextTick();

    expect(dummy).toBe(7);
    delete numbers.num1;
    await nextTick();

    expect(dummy).toBe(4);
  });

  it('should observe symbol keyed properties', async () => {
    const key = Symbol('symbol keyed prop');
    let dummy, hasDummy;
    let obj;

    const Comp = $unison(() => {
      obj = reactive<{ [key]?: string }>({ [key]: 'value' });
      effect(() => (dummy = obj[key]));
      effect(() => (hasDummy = key in obj));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe('value');
    expect(hasDummy).toBe(true);
    obj[key] = 'newValue';
    await nextTick();

    expect(dummy).toBe('newValue');

    delete obj[key];
    await nextTick();

    expect(dummy).toBe(undefined);
    expect(hasDummy).toBe(false);
  });

  it('should not observe well-known symbol keyed properties', async () => {
    const key = Symbol.isConcatSpreadable;
    let dummy;
    let array: any;

    const Comp = $unison(() => {
      array = reactive([]);
      effect(() => (dummy = array[key]));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(array[key]).toBe(undefined);
    expect(dummy).toBe(undefined);
    array[key] = true;
    await nextTick();

    expect(array[key]).toBe(true);
    expect(dummy).toBe(undefined);
  });

  it('should support manipulating an array while observing symbol keyed properties', async () => {
    const key = Symbol();
    let dummy;
    let array;

    const Comp = $unison(() => {
      array = reactive([1, 2, 3]);
      effect(() => (dummy = array[key]));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(undefined);

    array.pop();
    array.shift();
    array.splice(0, 1);
    await nextTick();

    expect(dummy).toBe(undefined);

    array[key] = 'value';
    array.length = 0;
    await nextTick();

    expect(dummy).toBe('value');
  });

  it('should observe function valued properties', async () => {
    const oldFunc = () => {};
    const newFunc = () => {};

    let dummy;
    let obj;

    const Comp = $unison(() => {
      obj = reactive({ func: oldFunc });
      effect(() => (dummy = obj.func));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(oldFunc);
    obj.func = newFunc;
    await nextTick();

    expect(dummy).toBe(newFunc);
  });

  it('should observe chained getters relying on this', async () => {
    let obj;

    let dummy;

    const Comp = $unison(() => {
      obj = reactive({
        a: 1,
        get b() {
          return this.a;
        },
      });

      effect(() => (dummy = obj.b));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(1);
    obj.a++;
    await nextTick();

    expect(dummy).toBe(2);
  });

  it('should observe methods relying on this', async () => {
    let obj;

    let dummy;
    const Comp = $unison(() => {
      obj = reactive({
        a: 1,
        b() {
          return this.a;
        },
      });

      effect(() => (dummy = obj.b()));
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(1);
    obj.a++;
    await nextTick();

    expect(dummy).toBe(2);
  });

  it('should not observe set operations without a value change', async () => {
    let hasDummy, getDummy;
    let obj;
    let getSpy;
    let hasSpy;

    const Comp = $unison(() => {
      obj = reactive({ prop: 'value' });

      getSpy = vi.fn(() => (getDummy = obj.prop));
      hasSpy = vi.fn(() => (hasDummy = 'prop' in obj));
      effect(getSpy);
      effect(hasSpy);

      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(getDummy).toBe('value');
    expect(hasDummy).toBe(true);
    obj.prop = 'value';
    await nextTick();

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(hasSpy).toHaveBeenCalledTimes(1);
    expect(getDummy).toBe('value');
    expect(hasDummy).toBe(true);
  });

  it('should not observe raw mutations', async () => {
    let dummy;
    let obj;
    const Comp = $unison(() => {
      obj = reactive<{ prop?: string }>({});
      effect(() => (dummy = toRaw(obj).prop));

      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(undefined);
    obj.prop = 'value';
    await nextTick();

    expect(dummy).toBe(undefined);
  });

  it('should not be triggered by raw mutations', async () => {
    let dummy;
    let obj;

    const Comp = $unison(() => {
      obj = reactive<{ prop?: string }>({});
      effect(() => (dummy = obj.prop));

      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(undefined);
    toRaw(obj).prop = 'value';
    await nextTick();

    expect(dummy).toBe(undefined);
  });

  it('should not be triggered by inherited raw setters', async () => {
    let dummy, parentDummy, hiddenValue: any;
    let obj;
    let parent;
    const Comp = $unison(() => {
      obj = reactive<{ prop?: number }>({});
      parent = reactive({
        set prop(value) {
          hiddenValue = value;
        },
        get prop() {
          return hiddenValue;
        },
      });
      Object.setPrototypeOf(obj, parent);
      effect(() => (dummy = obj.prop));
      effect(() => (parentDummy = parent.prop));

      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(undefined);
    expect(parentDummy).toBe(undefined);
    toRaw(obj).prop = 4;
    await nextTick();

    expect(dummy).toBe(undefined);
    expect(parentDummy).toBe(undefined);
  });

  it('should avoid implicit infinite recursive loops with itself', async () => {
    let counter;

    let counterSpy;

    const Comp = $unison(() => {
      counter = reactive({ num: 0 });

      counterSpy = vi.fn(() => counter.num++);
      effect(counterSpy);
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(counter.num).toBe(1);
    expect(counterSpy).toHaveBeenCalledTimes(1);
    counter.num = 4;
    await nextTick();

    expect(counter.num).toBe(5);
    expect(counterSpy).toHaveBeenCalledTimes(2);
  });

  it('should avoid infinite recursive loops when use Array.prototype.push/unshift/pop/shift', async () => {
    (['push', 'unshift'] as const).forEach((key) => {
      let arr;
      let counterSpy1;
      let counterSpy2;
      const Comp = $unison(() => {
        arr = reactive<number[]>([]);
        counterSpy1 = vi.fn(() => (arr[key] as any)(1));
        counterSpy2 = vi.fn(() => (arr[key] as any)(2));
        effect(counterSpy1);
        effect(counterSpy2);
        return () => <div />;
      });

      render(<Comp />);

      expect(arr.length).toBe(2);
      expect(counterSpy1).toHaveBeenCalledTimes(1);
      expect(counterSpy2).toHaveBeenCalledTimes(1);
    });
    (['pop', 'shift'] as const).forEach((key) => {
      let arr;
      let counterSpy1 = vi.fn(() => (arr[key] as any)());
      let counterSpy2 = vi.fn(() => (arr[key] as any)());

      const Comp = $unison(() => {
        arr = reactive<number[]>([1, 2, 3, 4]);
        counterSpy1 = vi.fn(() => (arr[key] as any)(1));
        counterSpy2 = vi.fn(() => (arr[key] as any)(2));
        effect(counterSpy1);
        effect(counterSpy2);
        return () => <div />;
      });

      render(<Comp />);

      expect(arr.length).toBe(2);
      expect(counterSpy1).toHaveBeenCalledTimes(1);
      expect(counterSpy2).toHaveBeenCalledTimes(1);
    });
  });

  it('should allow explicitly recursive raw function loops', async () => {
    let counter;
    let numSpy;

    const Comp = $unison(() => {
      counter = reactive({ num: 0 });
      numSpy = vi.fn(() => {
        counter.num++;
        if (counter.num < 10) {
          numSpy();
        }
      });
      effect(numSpy);

      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(counter.num).toEqual(10);
    expect(numSpy).toHaveBeenCalledTimes(10);
  });

  it('should avoid infinite loops with other effects', async () => {
    let nums;

    let spy1;
    let spy2;

    const Comp = $unison(() => {
      nums = reactive({ num1: 0, num2: 1 });

      spy1 = vi.fn(() => (nums.num1 = nums.num2));
      spy2 = vi.fn(() => (nums.num2 = nums.num1));
      effect(spy1);
      effect(spy2);

      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(nums.num1).toBe(1);
    expect(nums.num2).toBe(1);
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
    nums.num2 = 4;
    await nextTick();

    expect(nums.num1).toBe(4);
    expect(nums.num2).toBe(4);
    expect(spy1).toHaveBeenCalledTimes(2);
    expect(spy2).toHaveBeenCalledTimes(2);
    nums.num1 = 10;
    await nextTick();

    expect(nums.num1).toBe(10);
    expect(nums.num2).toBe(10);
    expect(spy1).toHaveBeenCalledTimes(3);
    expect(spy2).toHaveBeenCalledTimes(3);
  });

  it('should return a new reactive version of the function', async () => {
    function greet() {
      return 'Hello World';
    }
    let effect1;
    let effect2;
    const Comp = $unison(() => {
      effect1 = effect(greet);
      effect2 = effect(greet);

      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(typeof effect1).toBe('function');
    expect(typeof effect2).toBe('function');
    expect(effect1).not.toBe(greet);
    expect(effect1).not.toBe(effect2);
  });

  it.skip('should discover new branches while running automatically', async () => {
    let dummy;
    let obj;

    let conditionalSpy;
    const Comp = $unison(() => {
      obj = reactive({ prop: 'value', run: false });

      conditionalSpy = vi.fn(() => {
        dummy = obj.run ? obj.prop : 'other';
      });
      effect(conditionalSpy);

      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe('other');
    expect(conditionalSpy).toHaveBeenCalledTimes(1);
    obj.prop = 'Hi';
    await nextTick();

    expect(dummy).toBe('other');
    expect(conditionalSpy).toHaveBeenCalledTimes(1);
    obj.run = true;
    await nextTick();

    expect(dummy).toBe('Hi');
    expect(conditionalSpy).toHaveBeenCalledTimes(2);
    obj.prop = 'World';
    await nextTick();

    expect(dummy).toBe('World');
    expect(conditionalSpy).toHaveBeenCalledTimes(3);
  });

  it.skip('should discover new branches when running manually', () => {
    let dummy;
    let run = false;
    const obj = reactive({ prop: 'value' });
    const runner = effect(() => {
      dummy = run ? obj.prop : 'other';
    });

    expect(dummy).toBe('other');
    runner();
    expect(dummy).toBe('other');
    run = true;
    runner();
    expect(dummy).toBe('value');
    obj.prop = 'World';
    expect(dummy).toBe('World');
  });

  it.skip('should not be triggered by mutating a property, which is used in an inactive branch', () => {
    let dummy;
    const obj = reactive({ prop: 'value', run: true });

    const conditionalSpy = vi.fn(() => {
      dummy = obj.run ? obj.prop : 'other';
    });
    effect(conditionalSpy);

    expect(dummy).toBe('value');
    expect(conditionalSpy).toHaveBeenCalledTimes(1);
    obj.run = false;
    expect(dummy).toBe('other');
    expect(conditionalSpy).toHaveBeenCalledTimes(2);
    obj.prop = 'value2';
    expect(dummy).toBe('other');
    expect(conditionalSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle deep effect recursion using cleanup fallback', async () => {
    let results;
    let effects: { fx: ReactiveEffectRunner; index: number }[];

    const Comp = $unison(() => {
      results = reactive([0]);
      effects = [];
      for (let i = 1; i < 40; i++) {
        ((index) => {
          const fx = effect(() => {
            results[index] = results[index - 1] * 2;
          });
          effects.push({ fx, index });
        })(i);
      }
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(results[39]).toBe(0);
    results[0] = 1;
    await nextTick();

    expect(results[39]).toBe(Math.pow(2, 39));
  });

  it('should register deps independently during effect recursion', async () => {
    let input;
    let output;

    let fx1Spy;
    let fx1;
    let fx2Spy;

    let fx2;
    const Comp = $unison(() => {
      input = reactive({ a: 1, b: 2, c: 0 });
      output = reactive({ fx1: 0, fx2: 0 });

      fx1Spy = vi.fn(() => {
        let result = 0;
        if (input.c < 2) result += input.a;
        if (input.c > 1) result += input.b;
        output.fx1 = result;
      });

      fx1 = effect(fx1Spy);

      fx2Spy = vi.fn(() => {
        let result = 0;
        if (input.c > 1) result += input.a;
        if (input.c < 3) result += input.b;
        output.fx2 = result + output.fx1;
      });

      fx2 = effect(fx2Spy);
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(fx1).not.toBeNull();
    expect(fx2).not.toBeNull();

    expect(output.fx1).toBe(1);
    expect(output.fx2).toBe(2 + 1);
    expect(fx1Spy).toHaveBeenCalledTimes(1);
    expect(fx2Spy).toHaveBeenCalledTimes(1);

    fx1Spy.mockClear();
    fx2Spy.mockClear();
    input.b = 3;
    await nextTick();

    expect(output.fx1).toBe(1);
    expect(output.fx2).toBe(3 + 1);
    expect(fx1Spy).toHaveBeenCalledTimes(0);
    expect(fx2Spy).toHaveBeenCalledTimes(1);

    fx1Spy.mockClear();
    fx2Spy.mockClear();
    input.c = 1;
    await nextTick();

    expect(output.fx1).toBe(1);
    expect(output.fx2).toBe(3 + 1);
    expect(fx1Spy).toHaveBeenCalledTimes(1);
    expect(fx2Spy).toHaveBeenCalledTimes(1);

    fx1Spy.mockClear();
    fx2Spy.mockClear();
    input.c = 2;
    await nextTick();

    expect(output.fx1).toBe(3);
    expect(output.fx2).toBe(1 + 3 + 3);
    expect(fx1Spy).toHaveBeenCalledTimes(1);

    // Invoked due to change of fx1.
    expect(fx2Spy).toHaveBeenCalledTimes(1);

    fx1Spy.mockClear();
    fx2Spy.mockClear();
    input.c = 3;
    await nextTick();

    expect(output.fx1).toBe(3);
    expect(output.fx2).toBe(1 + 3);
    expect(fx1Spy).toHaveBeenCalledTimes(1);
    expect(fx2Spy).toHaveBeenCalledTimes(1);

    fx1Spy.mockClear();
    fx2Spy.mockClear();
    input.a = 1;
    await nextTick();

    expect(output.fx1).toBe(3);
    expect(output.fx2).toBe(10 + 3);
    expect(fx1Spy).toHaveBeenCalledTimes(0);
    expect(fx2Spy).toHaveBeenCalledTimes(1);
  });

  it('should not run multiple times for a single mutation', async () => {
    let dummy;
    let obj;
    let fnSpy;

    const Comp = $unison(() => {
      obj = reactive<Record<string, number>>({});
      fnSpy = vi.fn(() => {
        for (const key in obj) {
          dummy = obj[key];
        }
        dummy = obj.prop;
      });
      effect(fnSpy);
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(fnSpy).toHaveBeenCalledTimes(1);
    obj.prop = 16;
    await nextTick();

    expect(dummy).toBe(16);
    expect(fnSpy).toHaveBeenCalledTimes(2);
  });

  it('should observe json methods', async () => {
    let dummy = {} as Record<string, number>;
    let obj;

    const Comp = $unison(() => {
      obj = reactive<Record<string, number>>({});
      effect(() => {
        dummy = JSON.parse(JSON.stringify(obj));
      });
      obj.a = 1;
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy.a).toBe(1);
  });

  it('should observe class method invocations', async () => {
    class Model {
      count: number;
      constructor() {
        this.count = 0;
      }
      inc() {
        this.count++;
      }
    }
    let model;
    let dummy;

    const Comp = $unison(() => {
      model = reactive(new Model());
      dummy;
      effect(() => {
        dummy = model.count;
      });
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(0);
    model.inc();
    await nextTick();

    expect(dummy).toBe(1);
  });

  it.skip('lazy', () => {
    const obj = reactive({ foo: 1 });
    let dummy;
    const runner = effect(() => (dummy = obj.foo), { lazy: true });
    expect(dummy).toBe(undefined);

    expect(runner()).toBe(1);
    expect(dummy).toBe(1);
    obj.foo = 2;
    expect(dummy).toBe(2);
  });

  it.skip('scheduler', () => {
    let dummy;
    let run: any;
    const scheduler = vi.fn(() => {
      run = runner;
    });
    const obj = reactive({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { scheduler },
    );
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    // should be called on first trigger
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    // should not run yet
    expect(dummy).toBe(1);
    // manually run
    run();
    // should have run
    expect(dummy).toBe(2);
  });

  it('events: onTrack', async () => {
    const events: DebuggerEvent[] = [];
    let dummy;
    const onTrack = vi.fn((e: DebuggerEvent) => {
      events.push(e);
    });
    const obj = reactive({ foo: 1, bar: 2 });
    const runner = effect(
      () => {
        dummy = obj.foo;
        dummy = 'bar' in obj;
        dummy = Object.keys(obj);
      },
      { onTrack },
    );
    expect(dummy).toEqual(['foo', 'bar']);
    expect(onTrack).toHaveBeenCalledTimes(3);
    expect(events).toEqual([
      {
        effect: runner.effect,
        target: toRaw(obj),
        type: TrackOpTypes.GET,
        key: 'foo',
      },
      {
        effect: runner.effect,
        target: toRaw(obj),
        type: TrackOpTypes.HAS,
        key: 'bar',
      },
      {
        effect: runner.effect,
        target: toRaw(obj),
        type: TrackOpTypes.ITERATE,
        key: ITERATE_KEY,
      },
    ]);
  });

  it('events: onTrigger', async () => {
    const events: DebuggerEvent[] = [];
    let dummy;
    const onTrigger = vi.fn((e: DebuggerEvent) => {
      events.push(e);
    });
    const obj = reactive<{ foo?: number }>({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { onTrigger },
    );

    obj.foo!++;
    expect(dummy).toBe(2);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(events[0]).toEqual({
      effect: runner.effect,
      target: toRaw(obj),
      type: TriggerOpTypes.SET,
      key: 'foo',
      oldValue: 1,
      newValue: 2,
    });

    delete obj.foo;
    expect(dummy).toBeUndefined();
    expect(onTrigger).toHaveBeenCalledTimes(2);
    expect(events[1]).toEqual({
      effect: runner.effect,
      target: toRaw(obj),
      type: TriggerOpTypes.DELETE,
      key: 'foo',
      oldValue: 2,
    });
  });

  it('stop', async () => {
    let dummy;
    let obj;
    let stop;

    const Comp = $unison(() => {
      obj = reactive({ prop: 1 });
      stop = effect(() => {
        dummy = obj.prop;
      });
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    obj.prop = 2;
    await nextTick();

    expect(dummy).toBe(2);

    stop();
    obj.prop = 3;
    await nextTick();

    expect(dummy).toBe(2);
  });

  it.skip('events: onStop', () => {
    const onStop = vi.fn();
    const runner = effect(() => {}, {
      onStop,
    });

    stop(runner);
    expect(onStop).toHaveBeenCalled();
  });

  it.skip('stop: a stopped effect is nested in a normal effect', () => {
    let dummy;
    const obj = reactive({ prop: 1 });
    const runner = effect(() => {
      dummy = obj.prop;
    });
    stop(runner);
    obj.prop = 2;
    expect(dummy).toBe(1);

    // observed value in inner stopped effect
    // will track outer effect as an dependency
    effect(() => {
      runner();
    });
    expect(dummy).toBe(2);

    // notify outer effect to run
    obj.prop = 3;
    expect(dummy).toBe(3);
  });

  it('markRaw', async () => {
    let obj;
    let dummy;

    const Comp = $unison(() => {
      obj = reactive({
        foo: markRaw({
          prop: 0,
        }),
      });
      effect(() => {
        dummy = obj.foo.prop;
      });
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(0);
    obj.foo.prop++;
    await nextTick();

    expect(dummy).toBe(0);
    obj.foo = { prop: 1 };
    await nextTick();

    expect(dummy).toBe(1);
  });

  it('should not be triggered when the value and the old value both are NaN', async () => {
    let obj;
    let fnSpy;

    const Comp = $unison(() => {
      obj = reactive({
        foo: NaN,
      });
      fnSpy = vi.fn(() => obj.foo);
      effect(fnSpy);
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    obj.foo = NaN;
    await nextTick();

    expect(fnSpy).toHaveBeenCalledTimes(1);
  });

  it('should trigger all effects when array length is set to 0', async () => {
    let observed: any;
    let dummy, record;

    const Comp = $unison(() => {
      observed = reactive([1]);
      effect(() => {
        dummy = observed.length;
      });
      effect(() => {
        record = observed[0];
      });

      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(dummy).toBe(1);
    expect(record).toBe(1);

    observed[1] = 2;
    await nextTick();

    expect(observed[1]).toBe(2);

    observed.unshift(3);
    await nextTick();

    expect(dummy).toBe(3);
    expect(record).toBe(3);

    observed.length = 0;
    await nextTick();

    expect(dummy).toBe(0);
    expect(record).toBeUndefined();
  });

  it('should not be triggered when set with the same proxy', async () => {
    let obj;
    let obj2;
    let observed: any;
    let observed2: any;
    let fnSpy;
    let fnSpy2;

    const Comp = $unison(() => {
      obj = reactive({ foo: 1 });
      observed = reactive({ obj });
      fnSpy = vi.fn(() => observed.obj);
      effect(fnSpy);

      obj2 = reactive({ foo: 1 });
      observed2 = shallowReactive({ obj2 });
      fnSpy2 = vi.fn(() => observed2.obj2);

      effect(fnSpy2);
      return () => <div />;
    });

    render(<Comp />);
    await nextTick();

    expect(fnSpy).toHaveBeenCalledTimes(1);
    observed.obj = obj;
    await nextTick();

    expect(fnSpy).toHaveBeenCalledTimes(1);

    expect(fnSpy2).toHaveBeenCalledTimes(1);
    observed2.obj2 = obj2;
    await nextTick();

    expect(fnSpy2).toHaveBeenCalledTimes(1);
  });

  it('should be triggered when set length with string', async () => {
    let ret1 = 'idle';
    let ret2 = 'idle';
    let arr1;
    let arr2;

    const Comp = $unison(() => {
      arr1 = reactive(new Array(11).fill(0));
      arr2 = reactive(new Array(11).fill(0));
      effect(() => {
        ret1 = arr1[10] === undefined ? 'arr[10] is set to empty' : 'idle';
      });
      effect(() => {
        ret2 = arr2[10] === undefined ? 'arr[10] is set to empty' : 'idle';
      });
      return () => <div />;
    });

    render(<Comp />);

    arr1.length = 2;
    arr2.length = '2' as any;
    await nextTick();

    expect(ret1).toBe(ret2);
  });

  describe('readonly + reactive for Map', () => {
    test('should work with readonly(reactive(Map))', async () => {
      let m;
      let roM;
      let fnSpy;

      const Comp = $unison(() => {
        m = reactive(new Map());
        roM = readonly(m);
        fnSpy = vi.fn(() => roM.get(1));

        effect(fnSpy);
        return () => <div />;
      });

      render(<Comp />);
      await nextTick();

      expect(fnSpy).toHaveBeenCalledTimes(1);
      m.set(1, 1);
      await nextTick();

      expect(fnSpy).toHaveBeenCalledTimes(2);
    });

    test('should work with observed value as key', async () => {
      let key = reactive({});
      let m;
      let roM;
      let fnSpy;

      const Comp = $unison(() => {
        key = reactive({});
        m = reactive(new Map());
        m.set(key, 1);
        roM = readonly(m);
        fnSpy = vi.fn(() => roM.get(key));

        effect(fnSpy);
        return () => <div />;
      });

      render(<Comp />);
      await nextTick();

      expect(fnSpy).toHaveBeenCalledTimes(1);
      m.set(key, 1);
      await nextTick();

      expect(fnSpy).toHaveBeenCalledTimes(1);
      m.set(key, 2);
      await nextTick();

      expect(fnSpy).toHaveBeenCalledTimes(2);
    });

    test('should track hasOwnProperty', async () => {
      let obj: any;
      let has;
      let fnSpy;

      const Comp = $unison(() => {
        obj = reactive({});
        has = false;
        fnSpy = vi.fn();

        effect(() => {
          fnSpy();
          has = obj.hasOwnProperty('foo');
        });

        return () => <div />;
      });

      render(<Comp />);
      await nextTick();

      expect(fnSpy).toHaveBeenCalledTimes(1);
      expect(has).toBe(false);

      obj.foo = 1;
      await nextTick();

      expect(fnSpy).toHaveBeenCalledTimes(2);
      expect(has).toBe(true);

      delete obj.foo;
      await nextTick();

      expect(fnSpy).toHaveBeenCalledTimes(3);
      expect(has).toBe(false);

      // should not trigger on unrelated key
      obj.bar = 2;
      await nextTick();

      expect(fnSpy).toHaveBeenCalledTimes(3);
      expect(has).toBe(false);
    });
  });

  it.skip('should be triggered once with pauseScheduling', () => {
    const counter = reactive({ num: 0 });

    const counterSpy = vi.fn(() => counter.num);
    effect(counterSpy);

    counterSpy.mockClear();

    pauseScheduling();
    counter.num++;
    counter.num++;
    resetScheduling();
    expect(counterSpy).toHaveBeenCalledTimes(1);
  });

  // #10082
  it.skip('should set dirtyLevel when effect is allowRecurse and is running', async () => {
    const s = ref(0);
    const n = computed(() => s.value + 1);

    const Child = {
      setup() {
        s.value++;
        return () => n.value;
      },
    };

    const renderSpy = vi.fn();
    const Parent = {
      setup() {
        return () => {
          renderSpy();
          return [n.value, h(Child)];
        };
      },
    };

    const root = nodeOps.createElement('div');
    render(h(Parent), root);
    await nextTick();
    expect(serializeInner(root)).toBe('22');
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});
