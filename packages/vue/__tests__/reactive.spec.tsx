import React from 'react';
import {
  computed,
  isProxy,
  isReactive,
  markRaw,
  reactive,
  readonly,
  shallowReactive,
  shallowReadonly,
  toRaw,
  isRef,
  ref,
  nextTick,
} from '../src';
import { watchEffect as effect } from '../src';
import { act, render } from '@testing-library/react';
import { $unison } from '../src/index';

describe('reactivity/reactive', () => {
  test('Object', async () => {
    let original = { foo: 1 };
    let observed = reactive(original);

    const Comp = $unison(() => {
      original = { foo: 1 };
      observed = reactive(original);
      return () => <div />;
    });

    render(<Comp />);
    expect(observed).not.toBe(original);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    // get
    expect(observed.foo).toBe(1);
    // has
    expect('foo' in observed).toBe(true);
    // ownKeys
    expect(Object.keys(observed)).toEqual(['foo']);
  });

  test('proto', async () => {
    let obj = {};
    let reactiveObj = reactive(obj);

    const Comp = $unison(() => {
      obj = {};
      reactiveObj = reactive(obj);

      const prototype = reactiveObj['__proto__'];
      const otherObj = { data: ['a'] };
      expect(isReactive(otherObj)).toBe(false);
      const reactiveOther = reactive(otherObj);
      expect(isReactive(reactiveOther)).toBe(true);
      expect(reactiveOther.data[0]).toBe('a');
      return () => <div />;
    });

    render(<Comp />);
    expect(isReactive(reactiveObj)).toBe(true);
  });

  test('nested reactives', async () => {
    let original;
    let observed;

    const Comp = $unison(() => {
      original = {
        nested: {
          foo: 1,
        },
        array: [{ bar: 2 }],
      };
      observed = reactive(original);
      return () => <div />;
    });

    render(<Comp />);
    expect(isReactive(observed.nested)).toBe(true);
    expect(isReactive(observed.array)).toBe(true);
    expect(isReactive(observed.array[0])).toBe(true);
  });

  test('observing subtypes of IterableCollections(Map, Set)', async () => {
    // subtypes of Map
    class CustomMap extends Map {}

    // subtypes of Set
    class CustomSet extends Set {}

    let cmap, cset, dummy;
    const Comp = $unison(() => {
      cmap = reactive(new CustomMap());

      cset = reactive(new CustomSet());
      effect(() => (dummy = cset.has('value')));
      return () => <div />;
    });

    render(<Comp />);

    expect(cmap).toBeInstanceOf(Map);
    expect(isReactive(cmap)).toBe(true);
    cmap.set('key', {});
    await nextTick();

    expect(isReactive(cmap.get('key'))).toBe(true);

    expect(cset).toBeInstanceOf(Set);
    expect(isReactive(cset)).toBe(true);

    expect(dummy).toBe(false);
    cset.add('value');
    await nextTick();

    expect(dummy).toBe(true);
    cset.delete('value');
    await nextTick();

    expect(dummy).toBe(false);
  });

  test('observing subtypes of WeakCollections(WeakMap, WeakSet)', async () => {
    // subtypes of WeakMap
    class CustomMap extends WeakMap {}

    // subtypes of WeakSet
    class CustomSet extends WeakSet {}
    let cmap, cset, dummy;
    const key = {};
    const Comp = $unison(() => {
      cmap = reactive(new CustomMap());

      cset = reactive(new CustomSet());
      effect(() => (dummy = cset.has(key)));
      return () => <div />;
    });

    render(<Comp />);

    expect(cmap).toBeInstanceOf(WeakMap);
    expect(isReactive(cmap)).toBe(true);

    cmap.set(key, {});
    await nextTick();

    expect(isReactive(cmap.get(key))).toBe(true);

    expect(cset).toBeInstanceOf(WeakSet);
    expect(isReactive(cset)).toBe(true);

    expect(dummy).toBe(false);
    cset.add(key);
    await nextTick();

    expect(dummy).toBe(true);
    cset.delete(key);
    await nextTick();

    expect(dummy).toBe(false);
  });

  test('observed value should proxy mutations to original (Object)', async () => {
    let original: any;
    let observed;

    const Comp = $unison(() => {
      original = { foo: 1 };
      observed = reactive(original);

      return () => <div />;
    });

    render(<Comp />);
    // set
    observed.bar = 1;
    await nextTick();

    expect(observed.bar).toBe(1);
    expect(original.bar).toBe(1);
    // delete
    delete observed.foo;
    await nextTick();

    expect('foo' in observed).toBe(false);
    expect('foo' in original).toBe(false);
  });

  test('original value change should reflect in observed value (Object)', async () => {
    let original: any;
    let observed;

    const Comp = $unison(() => {
      original = { foo: 1 };
      observed = reactive(original);

      return () => <div />;
    });

    render(<Comp />);
    // set
    original.bar = 1;
    await nextTick();

    expect(original.bar).toBe(1);
    expect(observed.bar).toBe(1);
    // delete
    delete original.foo;
    await nextTick();

    expect('foo' in original).toBe(false);
    expect('foo' in observed).toBe(false);
  });

  test('setting a property with an unobserved value should wrap with reactive', async () => {
    let observed;
    let raw;

    const Comp = $unison(() => {
      observed = reactive<{ foo?: object }>({});
      raw = {};
      return () => <div />;
    });

    render(<Comp />);

    observed.foo = raw;
    await nextTick();

    expect(observed.foo).not.toBe(raw);
    expect(isReactive(observed.foo)).toBe(true);
  });

  test('observing already observed value should return same Proxy', async () => {
    let original;
    let observed;
    let observed2;

    const Comp = $unison(() => {
      original = { foo: 1 };
      observed = reactive(original);
      observed2 = reactive(observed);
      return () => <div />;
    });

    render(<Comp />);

    expect(observed2).toBe(observed);
  });

  test('observing the same value multiple times should return same Proxy', async () => {
    let original;
    let observed;
    let observed2;

    const Comp = $unison(() => {
      original = { foo: 1 };
      observed = reactive(original);
      observed2 = reactive(original);
      return () => <div />;
    });

    render(<Comp />);
    expect(observed2).toBe(observed);
  });

  test('should not pollute original object with Proxies', async () => {
    let original: any;
    let original2;
    let observed;
    let observed2;

    const Comp = $unison(() => {
      original = { foo: 1 };
      original2 = { bar: 2 };
      observed = reactive(original);
      observed2 = reactive(original2);
      return () => <div />;
    });

    render(<Comp />);
    observed.bar = observed2;
    await nextTick();

    expect(observed.bar).toBe(observed2);
    expect(original.bar).toBe(original2);
  });

  // #1246
  test('mutation on objects using reactive as prototype should not trigger', async () => {
    let observed;
    let original;
    let dummy;

    const Comp = $unison(() => {
      observed = reactive({ foo: 1 });
      original = Object.create(observed);
      effect(() => (dummy = original.foo));
      return () => <div />;
    });

    render(<Comp />);
    expect(dummy).toBe(1);
    observed.foo = 2;
    await nextTick();

    expect(dummy).toBe(2);
    original.foo = 3;
    await nextTick();

    expect(dummy).toBe(2);
    original.foo = 4;
    await nextTick();

    expect(dummy).toBe(2);
  });

  test('toRaw', async () => {
    let original;
    let observed;

    const Comp = $unison(() => {
      original = { foo: 1 };
      observed = reactive(original);
      return () => <div />;
    });

    render(<Comp />);

    expect(toRaw(observed)).toBe(original);
    expect(toRaw(original)).toBe(original);
  });

  test('toRaw on object using reactive as prototype', async () => {
    let original;
    let observed;
    let inherted;

    const Comp = $unison(() => {
      original = { foo: 1 };
      observed = reactive(original);
      inherted = Object.create(observed);
      return () => <div />;
    });

    render(<Comp />);

    expect(toRaw(inherted)).toBe(inherted);
  });

  test('toRaw on user Proxy wrapping reactive', async () => {
    let original;
    let re;
    let obj;
    let raw;

    const Comp = $unison(() => {
      original = {};
      re = reactive(original);
      obj = new Proxy(re, {});
      raw = toRaw(obj);
      return () => <div />;
    });

    render(<Comp />);
    expect(raw).toBe(original);
  });

  test('should not unwrap Ref<T>', async () => {
    let observedNumberRef;
    let observedObjectRef;
    const Comp = $unison(() => {
      observedNumberRef = reactive(ref(1));
      observedObjectRef = reactive(ref({ foo: 1 }));
      return () => <div />;
    });

    render(<Comp />);
    expect(isRef(observedNumberRef)).toBe(true);
    expect(isRef(observedObjectRef)).toBe(true);
  });

  test('should unwrap computed refs', async () => {
    // readonly
    let a;
    // writable
    let b;
    let obj;
    const Comp = $unison(() => {
      // readonly
      a = computed(() => 1);
      // writable
      b = computed({
        get: () => 1,
        set: () => {},
      });
      obj = reactive({ a, b });
      return () => <div />;
    });

    render(<Comp />);

    // check type
    obj.a + 1;
    obj.b + 1;
    await nextTick();

    expect(typeof obj.a).toBe(`number`);
    expect(typeof obj.b).toBe(`number`);
  });

  test('should allow setting property from a ref to another ref', async () => {
    let foo;
    let bar;
    let observed;
    let dummy;
    const Comp = $unison(() => {
      foo = ref(0);
      bar = ref(1);
      observed = reactive({ a: foo });
      dummy = computed(() => observed.a);
      return () => <div />;
    });

    render(<Comp />);
    expect(dummy.value).toBe(0);

    // @ts-expect-error
    observed.a = bar;
    await nextTick();

    expect(dummy.value).toBe(1);

    bar.value++;
    await nextTick();

    expect(dummy.value).toBe(2);
  });

  test('non-observable values', async () => {
    const assertValue = (value: any) => {
      reactive(value);
      expect(`value cannot be made reactive: ${String(value)}`).toHaveBeenWarnedLast();
    };

    // number
    assertValue(1);
    // string
    assertValue('foo');
    // boolean
    assertValue(false);
    // null
    assertValue(null);
    // undefined
    assertValue(undefined);
    // symbol
    const s = Symbol();
    assertValue(s);
    // bigint
    const bn = BigInt('9007199254740991');
    assertValue(bn);

    // built-ins should work and return same value
    const p = Promise.resolve();
    expect(reactive(p)).toBe(p);
    const r = new RegExp('');
    expect(reactive(r)).toBe(r);
    const d = new Date();
    expect(reactive(d)).toBe(d);
  });

  test('markRaw', async () => {
    let obj;

    const Comp = $unison(() => {
      obj = reactive({
        foo: { a: 1 },
        bar: markRaw({ b: 2 }),
      });
      return () => <div />;
    });

    render(<Comp />);
    expect(isReactive(obj.foo)).toBe(true);
    expect(isReactive(obj.bar)).toBe(false);
  });

  test('markRaw should skip non-extensible objects', async () => {
    const obj = Object.seal({ foo: 1 });
    expect(() => markRaw(obj)).not.toThrowError();
  });

  test('should not observe non-extensible objects', async () => {
    const obj = reactive({
      foo: Object.preventExtensions({ a: 1 }),
      // sealed or frozen objects are considered non-extensible as well
      bar: Object.freeze({ a: 1 }),
      baz: Object.seal({ a: 1 }),
    });
    expect(isReactive(obj.foo)).toBe(false);
    expect(isReactive(obj.bar)).toBe(false);
    expect(isReactive(obj.baz)).toBe(false);
  });

  test('should not observe objects with __v_skip', async () => {
    const original = {
      foo: 1,
      __v_skip: true,
    };
    const observed = reactive(original);
    expect(isReactive(observed)).toBe(false);
  });

  test('hasOwnProperty edge case: Symbol values', async () => {
    let key;
    let obj;
    let dummy;

    const Comp = $unison(() => {
      key = Symbol();
      obj = reactive({ [key]: 1 }) as { [key]?: 1 };
      dummy;
      effect(() => {
        dummy = obj.hasOwnProperty(key);
      });
      return () => <div />;
    });

    render(<Comp />);
    expect(dummy).toBe(true);

    delete obj[key];
    await nextTick();

    expect(dummy).toBe(false);
  });

  test('hasOwnProperty edge case: non-string values', async () => {
    let key;
    let obj;
    let dummy;

    const Comp = $unison(() => {
      key = {};
      obj = reactive({ '[object Object]': 1 }) as { '[object Object]'?: 1 };
      dummy;
      effect(() => {
        // @ts-expect-error
        dummy = obj.hasOwnProperty(key);
      });
      return () => <div />;
    });

    render(<Comp />);
    expect(dummy).toBe(true);

    // @ts-expect-error
    delete obj[key];

    await nextTick();

    expect(dummy).toBe(false);
  });

  test('isProxy', async () => {
    const foo = {};
    expect(isProxy(foo)).toBe(false);

    const fooRe = reactive(foo);
    expect(isProxy(fooRe)).toBe(true);

    const fooSRe = shallowReactive(foo);
    expect(isProxy(fooSRe)).toBe(true);

    const barRl = readonly(foo);
    expect(isProxy(barRl)).toBe(true);

    const barSRl = shallowReadonly(foo);
    expect(isProxy(barSRl)).toBe(true);

    const c = computed(() => {});
    expect(isProxy(c)).toBe(false);
  });
});
