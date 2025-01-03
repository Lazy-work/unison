import React from 'react';
import { computed, watchEffect, effect, reactive, $unison, ref, nextTick } from '../src/index';

import { act, render } from '@testing-library/react';

describe('reactivity/computed', () => {
  it('should return updated value', () => {
    let value;
    let cValue;

    const Comp = $unison(() => {
      value = reactive<{ foo?: number }>({});
      cValue = computed(() => value.foo);
      return () => <div />;
    });

    render(<Comp />);
    expect(cValue.value).toBe(undefined);
    value.foo = 1;
    expect(cValue.value).toBe(1);
  });

  it('should trigger effect', async () => {
    let value;
    let cValue;
    let dummy;

    const Comp = $unison(() => {
      value = reactive<{ foo?: number }>({});
      cValue = computed(() => value.foo);
      watchEffect(() => {
        dummy = cValue.value;
      });
      return () => <div />;
    });

    render(<Comp />);

    expect(dummy).toBe(undefined);

    value.foo = 1;
    await nextTick();
    expect(dummy).toBe(1);
  });

  it('should trigger effect when chained', async () => {
    let value;
    let getter1;
    let getter2;
    let c1;
    let c2;
    let dummy;

    const Comp = $unison(() => {
      value = reactive({ foo: 0 });
      getter1 = vi.fn(() => value.foo);
      getter2 = vi.fn(() => {
        return c1.value + 1;
      });
      c1 = computed(getter1);
      c2 = computed(getter2);

      watchEffect(() => {
        dummy = c2.value;
      });
      return () => <div />;
    });

      render(<Comp />);

    expect(dummy).toBe(1);
    expect(getter1).toHaveBeenCalledTimes(1);
    expect(getter2).toHaveBeenCalledTimes(1);
    value.foo++;
    await nextTick();
    expect(dummy).toBe(2);
    // should not result in duplicate calls
    expect(getter1).toHaveBeenCalledTimes(2);
    expect(getter2).toHaveBeenCalledTimes(2);
  });

  it('should trigger effect when chained (mixed invocations)', async () => {
    let value;
    let getter1;
    let getter2;
    let c1;
    let c2;

    let dummy;
    const Comp = $unison(() => {
      value = reactive({ foo: 0 });
      getter1 = vi.fn(() => value.foo);
      getter2 = vi.fn(() => {
        return c1.value + 1;
      });
      c1 = computed(getter1);
      c2 = computed(getter2);

      watchEffect(() => {
        dummy = c1.value + c2.value;
      });
      return () => <div />;
    });

      render(<Comp />);
    expect(dummy).toBe(1);

    expect(getter1).toHaveBeenCalledTimes(1);
    expect(getter2).toHaveBeenCalledTimes(1);
    value.foo++;
    await nextTick();
    expect(dummy).toBe(3);
    // should not result in duplicate calls
    expect(getter1).toHaveBeenCalledTimes(2);
    expect(getter2).toHaveBeenCalledTimes(2);
  });

  it('should trigger effect w/ setter', async () => {
    let n;
    let plusOne;

    let dummy;
    const Comp = $unison(() => {
      n = ref(1);
      plusOne = computed({
        get: () => n.value + 1,
        set: (val) => {
          n.value = val - 1;
        },
      });

      watchEffect(() => {
        dummy = n.value;
      });
      return () => <div />;
    });

      render(<Comp />);
    expect(dummy).toBe(1);

    plusOne.value = 0;
    await nextTick();
    expect(dummy).toBe(-1);
  });

  // #5720
  it('should invalidate before non-computed effects', () => {
    let plusOneValues: number[] = [];
    const n = ref(0);
    const plusOne = computed(() => n.value + 1);
    effect(() => {
      n.value;
      plusOneValues.push(plusOne.value);
    });
    // access plusOne, causing it to be non-dirty
    plusOne.value;
    // mutate n
    n.value++;
    // on the 2nd run, plusOne.value should have already updated.
    expect(plusOneValues).toMatchObject([1, 2]);
  });

  // https://github.com/vuejs/core/pull/5912#issuecomment-1738257692
  it('chained computed dirty reallocation after querying dirty', async () => {
    let _msg: string | undefined;

    let items;
    let isLoaded;
    let msg;

    const Comp = $unison(() => {
      items = ref<number[]>();
      isLoaded = computed(() => {
        return !!items.value;
      });
      msg = computed(() => {
        if (isLoaded.value) {
          return 'The items are loaded';
        } else {
          return 'The items are not loaded';
        }
      });

      watchEffect(() => {
        _msg = msg.value;
      });
      return () => <div />;
    });

    render(<Comp />);

    items.value = [1, 2, 3];
    items.value = [1, 2, 3];
    items.value = undefined;
    await nextTick();

    expect(_msg).toBe('The items are not loaded');
  });

  it('chained computed dirty reallocation after trigger computed getter', async () => {
    let _msg: string | undefined;

    let items;
    let isLoaded;
    let msg;

    const Comp = $unison(() => {
      items = ref<number[]>();
      isLoaded = computed(() => {
        return !!items.value;
      });
      msg = computed(() => {
        if (isLoaded.value) {
          return 'The items are loaded';
        } else {
          return 'The items are not loaded';
        }
      });

      watchEffect(() => {
        _msg = msg.value;
      });
      return () => <div />;
    });

    render(<Comp />);

    _msg = msg.value;
    items.value = [1, 2, 3];
    isLoaded.value; // <- trigger computed getter
    _msg = msg.value;
    items.value = undefined;
    _msg = msg.value;

    await nextTick();
    expect(_msg).toBe('The items are not loaded');
  });

  it('should trigger the second effect', async () => {
    const fnSpy = vi.fn();
    const v = ref(1);
    const c = computed(() => v.value);

    effect(() => {
      c.value;
    });
    effect(() => {
      c.value;
      fnSpy();
    });

    expect(fnSpy).toBeCalledTimes(1);
    v.value = 2;
    expect(fnSpy).toBeCalledTimes(2);
  });

  it.skip('should be not dirty after deps mutate (mutate deps in computed)', async () => {
    const state = reactive<any>({});
    const consumer = computed(() => {
      if (!('a' in state)) state.a = 1;
      return state.a;
    });
    const Comp = {
      setup: () => {
        nextTick().then(() => {
          state.a = 2;
        });
        return () => consumer.value;
      },
    };
    const root = nodeOps.createElement('div');
    render(h(Comp), root);
    await nextTick();

    await nextTick();

    expect(serializeInner(root)).toBe(`2`);
    // expect(COMPUTED_SIDE_EFFECT_WARN).toHaveBeenWarned();
  });
});
