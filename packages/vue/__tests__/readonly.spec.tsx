import { render } from '@testing-library/react';
import {
  watchEffect,
  isReactive,
  reactive,
  $unison,
  readonly,
  getCurrentInstance,
  nextTick
} from '../src/index';

describe('reactivity/readonly', () => {
  describe('Object', () => {
    it('should not trigger effects', async () => {
      let wrapped: any;
      let dummy;
      const Comp = $unison(() => {
        wrapped = readonly({ a: 1 });
        dummy;
        watchEffect(() => {
          dummy = wrapped.a;
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(1);
      wrapped.a = 2;
      await nextTick();

      expect(wrapped.a).toBe(1);
      expect(dummy).toBe(1);
      expect(`target is readonly`).toHaveBeenWarned();
    });
  });

  describe('Array', () => {
    it('should not trigger effects', async () => {
      let wrapped: any;
      let dummy;
      const Comp = $unison(() => {
        wrapped = readonly([{ a: 1 }]);
        watchEffect(() => {
          dummy = wrapped[0].a;
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(1);
      wrapped[0].a = 2;
      await nextTick();

      expect(wrapped[0].a).toBe(1);
      expect(dummy).toBe(1);
      expect(`target is readonly`).toHaveBeenWarnedTimes(1);
      wrapped[0] = { a: 2 };
      await nextTick();

      expect(wrapped[0].a).toBe(1);
      expect(dummy).toBe(1);
      expect(`target is readonly`).toHaveBeenWarnedTimes(2);
    });
  });

  const maps = [Map, WeakMap];
  maps.forEach((Collection: any) => {
    describe(Collection.name, () => {
      test('should not allow mutation & not trigger effect', async () => {
        let map;
        let key;
        let dummy;

        const Comp = $unison(() => {
          map = readonly(new Collection());
          key = {};
          watchEffect(() => {
            dummy = map.get(key);
          });
          return () => <div />;
        });
        render(<Comp />);

        expect(dummy).toBeUndefined();
        map.set(key, 1);
        await nextTick();

        expect(dummy).toBeUndefined();
        expect(map.has(key)).toBe(false);
        expect(`Set operation on key "${key}" failed: target is readonly.`).toHaveBeenWarned();
      });
    });
  });

  const sets = [Set, WeakSet];
  sets.forEach((Collection: any) => {
    describe(Collection.name, () => {
      test('should not allow mutation & not trigger effect', async () => {
        let set;
        let key;
        let dummy;
        const Comp = $unison(() => {
          set = readonly(new Collection());
          key = {};
          watchEffect(() => {
            dummy = set.has(key);
          });
          return () => <div />;
        });
        render(<Comp />);

        expect(dummy).toBe(false);
        set.add(key);
        await nextTick();

        expect(dummy).toBe(false);
        expect(set.has(key)).toBe(false);
        expect(`Add operation on key "${key}" failed: target is readonly.`).toHaveBeenWarned();
      });
    });
  });

  test('readonly should track and trigger if wrapping reactive original', async () => {
    let a;
    let b;

    let dummy;
    const Comp = $unison(() => {
      a = reactive({ n: 1 });
      b = readonly(a);

      watchEffect(() => {
        dummy = b.n;
      });
      return () => <div />;
    });

    render(<Comp />);

    // should return true since it's wrapping a reactive source
    expect(isReactive(b)).toBe(true);
    expect(dummy).toBe(1);
    a.n++;
    await nextTick();

    expect(b.n).toBe(2);
    expect(dummy).toBe(2);
  });

  test('readonly collection should not track', async () => {
    let map;

    let reMap;
    let roMap;

    let dummy;
    const Comp = $unison(() => {
      map = new Map();
      map.set('foo', 1);

      reMap = reactive(map);
      roMap = readonly(map);

      watchEffect(() => {
        dummy = roMap.get('foo');
      });
      return () => <div />;
    });

    render(<Comp />);

    expect(dummy).toBe(1);
    reMap.set('foo', 2);
    await nextTick();

    let value;
    value = roMap.get('foo');
    await nextTick();

    expect(value).toBe(2);
    // should not trigger
    expect(dummy).toBe(1);
  });

  test.skip('readonly array should not track', () => {
    let arr;
    let roArr;
    let context;

    const Comp = $unison(() => {
      arr = [1];
      roArr = readonly(arr);
      context = getCurrentInstance();
      watchEffect(() => {
        roArr.includes(2);
      });
      return () => <div />;
    });

    render(<Comp />);

    expect(context.pendingEffects).toBe(0);
  });

  test('readonly should track and trigger if wrapping reactive original (collection)', async () => {
    let a;
    let b;

    let dummy;

    const Comp = $unison(() => {
      a = reactive(new Map());
      b = readonly(a);
      a.set('foo', 1);
      watchEffect(() => {
        dummy = b.get('foo');
      });
      return () => <div />;
    });

    render(<Comp />);

    // should return true since it's wrapping a reactive source
    expect(isReactive(b)).toBe(true);
    expect(dummy).toBe(1);
    a.set('foo', 2);
    await nextTick();

    expect(b.get('foo')).toBe(2);
    expect(dummy).toBe(2);
  });
});
