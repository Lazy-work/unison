import {
  type Ref,
  customRef,
  shallowRef,
  triggerRef,
  unref,
  isReadonly,
  isShallow,
  readonly,
  shallowReactive,
  watchEffect,
  isReactive,
  isRef,
  reactive,
  ref,
  toRef,
  toRefs,
  computed,
  nextTick,
  $unison,
} from '../src/index';
import { act, render } from '@testing-library/react';

describe('reactivity/ref', () => {
  it('should be reactive', async () => {
    let a;
    let dummy;
    let fn;
    const Comp = $unison(() => {
      a = ref(1);
      fn = vi.fn(() => {
        dummy = a.value;
      });
      watchEffect(fn);
      return () => <div />;
    });

    render(<Comp />);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);
    a.value = 2;
    await nextTick();

    a.value = 2;
    expect(fn).toHaveBeenCalledTimes(2);
    expect(dummy).toBe(2);
    act(() => {
      // same value should not trigger
      a.value = 2;
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should make nested properties reactive', async () => {
    let a;
    let dummy;

    const Comp = $unison(() => {
      a = ref({
        count: 1,
      });
      watchEffect(() => {
        dummy = a.value.count;
      });
      return () => <div />;
    });

    render(<Comp />);

    expect(dummy).toBe(1);
    a.value.count = 2;
    await nextTick();

    expect(dummy).toBe(2);
  });

  it('should work without initial value', async () => {
    let a = ref();
    let dummy;
    const Comp = $unison(() => {
      a = ref();
      watchEffect(() => {
        dummy = a.value;
      });
      return () => <div />;
    });

    render(<Comp />);

    expect(dummy).toBe(undefined);
    a.value = 2;
    await nextTick();

    expect(dummy).toBe(2);
  });

  it('should work like a normal property when nested in a reactive object', async () => {
    let a;
    let obj;

    let dummy1: number;
    let dummy2: number;

    const Comp = $unison(() => {
      a = ref(1);
      obj = reactive({
        a,
        b: {
          c: a,
        },
      });

      watchEffect(() => {
        dummy1 = obj.a;
        dummy2 = obj.b.c;
      });
      return () => <div />;
    });

    render(<Comp />);

    const assertDummiesEqualTo = (val: number) => [dummy1, dummy2].forEach((dummy) => expect(dummy).toBe(val));

    assertDummiesEqualTo(1);
    a.value++;
    await nextTick();

    assertDummiesEqualTo(2);
    obj.a++;
    await nextTick();

    assertDummiesEqualTo(3);
    obj.b.c++;
    await nextTick();

    assertDummiesEqualTo(4);
  });

  it('should unwrap nested ref in types', async () => {
    const Comp = $unison(() => {
      const a = ref(0);
      const b = ref(a);

      expect(typeof (b.value + 1)).toBe('number');
      return () => <div />;
    });

    render(<Comp />);
  });

  it('should unwrap nested values in types', async () => {
    const Comp = $unison(() => {
      const a = {
        b: ref(0),
      };

      const c = ref(a);

      expect(typeof (c.value.b + 1)).toBe('number');
      return () => <div />;
    });

    render(<Comp />);
  });

  it('should NOT unwrap ref types nested inside arrays', async () => {
    const Comp = $unison(() => {
      const arr = ref([1, ref(3)]).value;
      expect(isRef(arr[0])).toBe(false);
      expect(isRef(arr[1])).toBe(true);
      expect((arr[1] as Ref).value).toBe(3);
      return () => <div />;
    });

    render(<Comp />);
  });

  it('should unwrap ref types as props of arrays', async () => {
    const Comp = $unison(() => {
      const arr = [ref(0)];
      const symbolKey = Symbol('');
      arr['' as any] = ref(1);
      arr[symbolKey as any] = ref(2);
      const arrRef = ref(arr).value;
      expect(isRef(arrRef[0])).toBe(true);
      expect(isRef(arrRef['' as any])).toBe(false);
      expect(isRef(arrRef[symbolKey as any])).toBe(false);
      expect(arrRef['' as any]).toBe(1);
      expect(arrRef[symbolKey as any]).toBe(2);
      return () => <div />;
    });

    render(<Comp />);
  });

  it('should keep tuple types', async () => {
    const Comp = $unison(() => {
      const tuple: [number, string, { a: number }, () => number, Ref<number>] = [0, '1', { a: 1 }, () => 0, ref(0)];
      const tupleRef = ref(tuple);

      tupleRef.value[0]++;
      expect(tupleRef.value[0]).toBe(1);
      tupleRef.value[1] += '1';
      expect(tupleRef.value[1]).toBe('11');
      tupleRef.value[2].a++;
      expect(tupleRef.value[2].a).toBe(2);
      expect(tupleRef.value[3]()).toBe(0);
      tupleRef.value[4].value++;
      expect(tupleRef.value[4].value).toBe(1);
      return () => <div />;
    });

    render(<Comp />);
  });

  it('should keep symbols', async () => {
    const Comp = $unison(() => {
      const customSymbol = Symbol();
      const obj = {
        [Symbol.asyncIterator]: ref(1),
        [Symbol.hasInstance]: { a: ref('a') },
        [Symbol.isConcatSpreadable]: { b: ref(true) },
        [Symbol.iterator]: [ref(1)],
        [Symbol.match]: new Set<Ref<number>>(),
        [Symbol.matchAll]: new Map<number, Ref<string>>(),
        [Symbol.replace]: { arr: [ref('a')] },
        [Symbol.search]: { set: new Set<Ref<number>>() },
        [Symbol.species]: { map: new Map<number, Ref<string>>() },
        [Symbol.split]: new WeakSet<Ref<boolean>>(),
        [Symbol.toPrimitive]: new WeakMap<Ref<boolean>, string>(),
        [Symbol.toStringTag]: { weakSet: new WeakSet<Ref<boolean>>() },
        [Symbol.unscopables]: { weakMap: new WeakMap<Ref<boolean>, string>() },
        [customSymbol]: { arr: [ref(1)] },
      };

      const objRef = ref(obj);

      const keys: (keyof typeof obj)[] = [
        Symbol.asyncIterator,
        Symbol.hasInstance,
        Symbol.isConcatSpreadable,
        Symbol.iterator,
        Symbol.match,
        Symbol.matchAll,
        Symbol.replace,
        Symbol.search,
        Symbol.species,
        Symbol.split,
        Symbol.toPrimitive,
        Symbol.toStringTag,
        Symbol.unscopables,
        customSymbol,
      ];

      keys.forEach((key) => {
        expect(objRef.value[key]).toStrictEqual(obj[key]);
      });
      return () => <div />;
    });

    render(<Comp />);
  });

  test('unref', async () => {
    const Comp = $unison(() => {
      expect(unref(1)).toBe(1);
      expect(unref(ref(1))).toBe(1);
      return () => <div />;
    });

    render(<Comp />);
  });

  test('shallowRef', async () => {
    let sref;

    let dummy;
    const Comp = $unison(() => {
      sref = shallowRef({ a: 1 });
      expect(isReactive(sref.value)).toBe(false);

      watchEffect(() => {
        dummy = sref.value.a;
      });
      return () => <div />;
    });

    render(<Comp />);

    expect(dummy).toBe(1);

    sref.value = { a: 2 };
    await nextTick();

    expect(isReactive(sref.value)).toBe(false);
    expect(dummy).toBe(2);
  });

  test('shallowRef force trigger', async () => {
    let sref;
    let dummy;

    const Comp = $unison(() => {
      sref = shallowRef({ a: 1 });

      watchEffect(() => {
        dummy = sref.value.a;
      });
      return () => <div />;
    });

    render(<Comp />);

    expect(dummy).toBe(1);

    sref.value.a = 2;
    await nextTick();

    expect(dummy).toBe(1); // should not trigger yet

    // force trigger
    triggerRef(sref);
    await nextTick();

    expect(dummy).toBe(2);
  });

  test('isRef', async () => {
    const Comp = $unison(() => {
      expect(isRef(ref(1))).toBe(true);
      expect(isRef(computed(() => 1))).toBe(true);

      expect(isRef(0)).toBe(false);
      expect(isRef(1)).toBe(false);
      // an object that looks like a ref isn't necessarily a ref
      expect(isRef({ value: 0 })).toBe(false);
      return () => <div />;
    });

    render(<Comp />);
  });

  test('toRef', async () => {
    let a;
    let x;
    let r;
    let dummyX;

    const Comp = $unison(() => {
      a = reactive({
        x: 1,
      });
      x = toRef(a, 'x');
      expect(isRef(x)).toBe(true);
      expect(x.value).toBe(1);

      // source -> proxy
      a.x = 2;
      expect(x.value).toBe(2);

      // proxy -> source
      x.value = 3;
      expect(a.x).toBe(3);

      // reactivity
      watchEffect(() => {
        dummyX = x.value;
      });

      // should keep ref
      r = { x: ref(1) };
      expect(toRef(r, 'x')).toBe(r.x);
      return () => <div />;
    });

    render(<Comp />);

    expect(dummyX).toBe(x.value);

    // mutating source should trigger effect using the proxy refs
    a.x = 4;
    await nextTick();
    expect(dummyX).toBe(4);
  });

  test('toRef on array', async () => {
    const Comp = $unison(() => {
      const a = reactive(['a', 'b']);
      const r = toRef(a, 1);
      expect(r.value).toBe('b');
      r.value = 'c';
      expect(r.value).toBe('c');
      expect(a[1]).toBe('c');
      return () => <div />;
    });

    render(<Comp />);
  });

  test('toRef default value', async () => {
    const Comp = $unison(() => {
      const a: { x: number | undefined } = { x: undefined };
      const x = toRef(a, 'x', 1);
      expect(x.value).toBe(1);

      a.x = 2;
      expect(x.value).toBe(2);

      a.x = undefined;
      expect(x.value).toBe(1);
      return () => <div />;
    });

    render(<Comp />);
  });

  test('toRef getter', async () => {
    const Comp = $unison(() => {
      const x = toRef(() => 1);
      expect(x.value).toBe(1);
      expect(isRef(x)).toBe(true);
      expect(unref(x)).toBe(1);
      //@ts-expect-error
      expect(() => (x.value = 123)).toThrow();

      expect(isReadonly(x)).toBe(true);
      return () => <div />;
    });

    render(<Comp />);
  });

  test('toRefs', async () => {
    let dummyX, dummyY;
    let a, x, y;
    const Comp = $unison(() => {
      a = reactive({
        x: 1,
        y: 2,
      });

      const refs = toRefs(a);
      x = refs.x;
      y = refs.y;

      expect(isRef(x)).toBe(true);
      expect(isRef(y)).toBe(true);
      expect(x.value).toBe(1);
      expect(y.value).toBe(2);

      // source -> proxy
      a.x = 2;
      a.y = 3;
      expect(x.value).toBe(2);
      expect(y.value).toBe(3);

      // proxy -> source
      x.value = 3;
      y.value = 4;
      expect(a.x).toBe(3);
      expect(a.y).toBe(4);

      // reactivity
      watchEffect(() => {
        dummyX = x.value;
        dummyY = y.value;
      });
      return () => <div />;
    });

    render(<Comp />);

    expect(dummyX).toBe(x.value);
    expect(dummyY).toBe(y.value);

    // mutating source should trigger effect using the proxy refs
    a.x = 4;
    a.y = 5;
    await nextTick();

    expect(dummyX).toBe(4);
    expect(dummyY).toBe(5);
  });

  test('toRefs should warn on plain object', async () => {
    const Comp = $unison(() => {
      toRefs({});
      expect(`toRefs() expects a reactive object`).toHaveBeenWarned();
      return () => <div />;
    });

    render(<Comp />);
  });

  test('toRefs should warn on plain array', async () => {
    const Comp = $unison(() => {
      toRefs([]);
      expect(`toRefs() expects a reactive object`).toHaveBeenWarned();
      return () => <div />;
    });

    render(<Comp />);
  });

  test('toRefs reactive array', async () => {
    const Comp = $unison(() => {
      const arr = reactive(['a', 'b', 'c']);
      const refs = toRefs(arr);

      expect(Array.isArray(refs)).toBe(true);

      refs[0].value = '1';
      expect(arr[0]).toBe('1');

      arr[1] = '2';
      expect(refs[1].value).toBe('2');
      return () => <div />;
    });

    render(<Comp />);
  });

  test('customRef', async () => {
    let value;
    let _trigger;

    let custom;

    let dummy;
    const Comp = $unison(() => {
      value = 1;

      custom = customRef((track, trigger) => ({
        get() {
          track();
          return value;
        },
        set(newValue: number) {
          value = newValue;
          _trigger = trigger;
        },
      }));

      expect(isRef(custom)).toBe(true);

      watchEffect(() => {
        dummy = custom.value;
      });
      return () => <div />;
    });

    render(<Comp />);

    expect(dummy).toBe(1);

    custom.value = 2;
    await nextTick();

    // should not trigger yet
    expect(dummy).toBe(1);

    _trigger!();
    await nextTick();

    expect(dummy).toBe(2);
  });

  test('should not trigger when setting value to same proxy', async () => {
    let obj;
    let a;
    let spy1;

    let b;
    let spy2;
    const Comp = $unison(() => {
      obj = reactive({ count: 0 });
      a = ref(obj);
      spy1 = vi.fn(() => a.value);

      watchEffect(spy1);
      b = shallowRef(obj);
      spy2 = vi.fn(() => b.value);

      watchEffect(spy2);
      return () => <div />;
    });

    render(<Comp />);

    a.value = obj;
    await nextTick();

    expect(spy1).toBeCalledTimes(1);

    b.value = obj;
    await nextTick();

    expect(spy2).toBeCalledTimes(1);
  });

  test('ref should preserve value shallow/readonly-ness', async () => {
    let original;
    let r;
    let s;
    let rr;
    let a;
    const Comp = $unison(() => {
      original = {};
      r = reactive(original);
      s = shallowReactive(original);
      rr = readonly(original);
      a = ref(original);
      return () => <div />;
    });

    render(<Comp />);

    expect(a.value).toBe(r);

    a.value = s;
    await nextTick();

    expect(a.value).toBe(s);
    expect(a.value).not.toBe(r);

    a.value = rr;
    await nextTick();

    expect(a.value).toBe(rr);
    expect(a.value).not.toBe(r);
  });
});
