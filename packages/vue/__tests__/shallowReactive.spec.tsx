import React from 'react';
import {
  type Ref,
  nextTick,
  ref,
  isReactive,
  shallowReactive,
  watchEffect,
  $unison,
} from '../src';

import { render } from '@testing-library/react';

describe('shallowReactive', () => {
  // vuejs/vue#12688
  test('should not mutate refs', async () => {
    let original;
    let foo;
    const Comp = $unison(() => {
      original = ref(123);
      foo = shallowReactive<{ bar: Ref<number> | number }>({
        bar: original,
      });
      return () => <div />;
    });

    render(<Comp />);

    expect(foo.bar).toBe(original);
    foo.bar = 234;
    await nextTick();

    expect(foo.bar).toBe(234);
    expect(original.value).toBe(123);
  });

  describe('collections', () => {
    test('should be reactive', async () => {
      let shallowSet;
      let a;
      let size;

      const Comp = $unison(() => {
        shallowSet = shallowReactive(new Set());
        a = {};

        watchEffect(() => {
          size = shallowSet.size;
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(size).toBe(0);

      shallowSet.add(a);
      await nextTick();

      expect(size).toBe(1);

      shallowSet.delete(a);
      await nextTick();

      expect(size).toBe(0);
    });

    test('should not get reactive entry', async () => {
      const shallowMap = shallowReactive(new Map());
      const a = {};
      const key = 'a';

      shallowMap.set(key, a);

      expect(isReactive(shallowMap.get(key))).toBe(false);
    });

    // #1210
    test('onTrack on called on objectSpread', async () => {
      let onTrackFn;
      let shallowSet;
      let a;

      const Comp = $unison(() => {
        onTrackFn = vi.fn();
        shallowSet = shallowReactive(new Set());

        watchEffect(
          () => {
            a = Array.from(shallowSet);
          },
          {
            onTrack: onTrackFn,
          },
        );
        return () => <div />;
      });

      render(<Comp />);

      expect(a).toMatchObject([]);
      expect(onTrackFn).toHaveBeenCalled();
    });
  });

  describe('array', () => {
    test('should be reactive', async () => {
      let shallowArray;
      let a;
      let size;

      const Comp = $unison(() => {
        shallowArray = shallowReactive<unknown[]>([]);
        a = {};

        watchEffect(() => {
          size = shallowArray.length;
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(size).toBe(0);

      shallowArray.push(a);
      await nextTick();

      expect(size).toBe(1);

      shallowArray.pop();
      await nextTick();

      expect(size).toBe(0);
    });
    test('onTrack on called on objectSpread', async () => {
      let onTrackFn;
      let shallowArray;
      let a;

      const Comp = $unison(() => {
        onTrackFn = vi.fn();
        shallowArray = shallowReactive([]);
        a = {};

        watchEffect(
          () => {
            a = Array.from(shallowArray);
          },
          {
            onTrack: onTrackFn,
          },
        );
        return () => <div />;
      });

      render(<Comp />);

      expect(a).toMatchObject([]);
      expect(onTrackFn).toHaveBeenCalled();
    });
  });
});
