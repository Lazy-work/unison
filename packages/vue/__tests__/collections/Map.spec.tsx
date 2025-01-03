import { act, render } from '@testing-library/react';
import { isReactive, reactive, toRaw, watchEffect as effect } from '../../src/index';
import { $unison } from '../../../src/management';
import { nextTick } from '../../../src/lifecycle';

describe('reactivity/collections', () => {
  function coverCollectionFn(collection: Map<any, any>, fnName: string) {
    const spy = vi.fn();
    const proxy = reactive(collection);
    (collection as any)[fnName] = spy;
    return [proxy as any, spy];
  }

  describe('Map', () => {
    test('instanceof', () => {
      const original = new Map();
      const observed = reactive(original);
      expect(isReactive(observed)).toBe(true);
      expect(original).toBeInstanceOf(Map);
      expect(observed).toBeInstanceOf(Map);
    });

    it('should observe mutations', async () => {
      let dummy;
      let map;
      const Comp = $unison(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = map.get('key');
        });
        return () => <div />;
      });

      render(<Comp />);
      await nextTick();

      await nextTick();

      expect(dummy).toBe(undefined);
      map.set('key', 'value');

      await nextTick();

      expect(dummy).toBe('value');
      map.set('key', 'value2');
      await nextTick();

      expect(dummy).toBe('value2');
      map.delete('key');
      await nextTick();

      expect(dummy).toBe(undefined);
    });

    it('should observe mutations with observed value as key', async () => {
      let dummy;
      let key;
      let value;
      let map;

      const Comp = $unison(() => {
        key = reactive({});
        value = reactive({});
        map = reactive(new Map());
        effect(() => {
          dummy = map.get(key);
        });
        return () => <div />;
      });

      render(<Comp />);
      await nextTick();


      expect(dummy).toBe(undefined);
      map.set(key, value);
      await nextTick();

      expect(dummy).toBe(value);
      map.delete(key);
      await nextTick();

      expect(dummy).toBe(undefined);
    });

    it('should observe size mutations', async () => {
      let dummy;
      let map;

      const Comp = $unison(() => {
        map = reactive(new Map());
        effect(() => (dummy = map.size));

        return () => <div />;
      });
      render(<Comp />);

      await nextTick();

      expect(dummy).toBe(0);

      map.set('key1', 'value');
      map.set('key2', 'value2');

      await nextTick();


      expect(dummy).toBe(2);
      map.delete('key1');
      await nextTick();

      expect(dummy).toBe(1);
      map.clear();

      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should observe for of iteration', async () => {
      let dummy;
      let map;

      const Comp = $unison(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = 0;
          for (const [key, num] of map) {
            key;
            dummy += num;
          }
        });
        return () => <div />;
      });
      render(<Comp />);

      expect(dummy).toBe(0);
      map.set('key1', 3);
      await nextTick();

      expect(dummy).toBe(3);
      map.set('key2', 2);
      await nextTick();

      expect(dummy).toBe(5);
      // iteration should track mutation of existing entries (#709)

      map.set('key1', 4);
      await nextTick();

      expect(dummy).toBe(6);
      map.delete('key1');
      await nextTick();

      expect(dummy).toBe(2);
      map.clear();
      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should observe forEach iteration', async () => {
      let dummy: any;
      let map;

      const Comp = $unison(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = 0;
          map.forEach((num: any) => (dummy += num));
        });
        return () => <div />;
      });
      render(<Comp />);
      expect(dummy).toBe(0);
      map.set('key1', 3);
      await nextTick();

      expect(dummy).toBe(3);
      map.set('key2', 2);
      await nextTick();

      expect(dummy).toBe(5);
      // iteration should track mutation of existing entries (#709)
      map.set('key1', 4);
      await nextTick();

      expect(dummy).toBe(6);
      map.delete('key1');
      await nextTick();

      expect(dummy).toBe(2);
      map.clear();
      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should observe keys iteration', async () => {
      let dummy;
      let map;

      const Comp = $unison(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = 0;
          for (const key of map.keys()) {
            dummy += key;
          }
        });
        return () => <div />;
      });
      render(<Comp />);
      expect(dummy).toBe(0);
      map.set(3, 3);
      await nextTick();

      expect(dummy).toBe(3);
      map.set(2, 2);
      await nextTick();

      expect(dummy).toBe(5);
      map.delete(3);
      await nextTick();

      expect(dummy).toBe(2);
      map.clear();
      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should observe values iteration', async () => {
      let dummy;
      let map;

      const Comp = $unison(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = 0;
          for (const num of map.values()) {
            dummy += num;
          }
        });
        return () => <div />;
      });
      render(<Comp />);

      expect(dummy).toBe(0);
      map.set('key1', 3);
      await nextTick();

      expect(dummy).toBe(3);
      map.set('key2', 2);
      await nextTick();

      expect(dummy).toBe(5);
      // iteration should track mutation of existing entries (#709)
      map.set('key1', 4);
      await nextTick();

      expect(dummy).toBe(6);
      map.delete('key1');
      await nextTick();

      expect(dummy).toBe(2);
      map.clear();
      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should observe entries iteration', async () => {
      let dummy;
      let dummy2;
      let map;

      const Comp = $unison(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = '';
          dummy2 = 0;
          for (const [key, num] of map.entries()) {
            dummy += key;
            dummy2 += num;
          }
        });
        return () => <div />;
      });
      render(<Comp />);
      expect(dummy).toBe('');
      expect(dummy2).toBe(0);
      map.set('key1', 3);
      await nextTick();

      expect(dummy).toBe('key1');
      expect(dummy2).toBe(3);
      map.set('key2', 2);
      await nextTick();

      expect(dummy).toBe('key1key2');
      expect(dummy2).toBe(5);
      // iteration should track mutation of existing entries (#709)
      map.set('key1', 4);
      await nextTick();

      expect(dummy).toBe('key1key2');
      expect(dummy2).toBe(6);
      map.delete('key1');
      await nextTick();

      expect(dummy).toBe('key2');
      expect(dummy2).toBe(2);
      map.clear();
      await nextTick();

      expect(dummy).toBe('');
      expect(dummy2).toBe(0);
    });

    it('should be triggered by clearing', async () => {
      let dummy;
      let map;

      const Comp = $unison(() => {
        map = reactive(new Map());
        effect(() => (dummy = map.get('key')));
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(undefined);
      map.set('key', 3);
      await nextTick();

      expect(dummy).toBe(3);
      map.clear();
      await nextTick();

      expect(dummy).toBe(undefined);
    });

    it('should not observe custom property mutations', async () => {
      let dummy;
      let map: any;

      const Comp = $unison(() => {
        map = reactive(new Map());
        effect(() => (dummy = map.customProp));
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(undefined);
      map.customProp = 'Hello World';
      await nextTick();

      expect(dummy).toBe(undefined);
    });

    it('should not observe non value changing mutations', async () => {
      let dummy;
      let map;
      let mapSpy;

      const Comp = $unison(() => {
        map = reactive(new Map());
        mapSpy = vi.fn(() => (dummy = map.get('key')));
        effect(mapSpy);
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(undefined);
      expect(mapSpy).toHaveBeenCalledTimes(1);

      map.set('key', undefined);
      await nextTick();

      expect(dummy).toBe(undefined);
      expect(mapSpy).toHaveBeenCalledTimes(2);
      map.set('key', 'value');
      await nextTick();

      expect(dummy).toBe('value');
      expect(mapSpy).toHaveBeenCalledTimes(3);

      map.set('key', 'value');
      await nextTick();

      expect(dummy).toBe('value');
      expect(mapSpy).toHaveBeenCalledTimes(3);
      map.delete('key');
      await nextTick();

      expect(dummy).toBe(undefined);
      expect(mapSpy).toHaveBeenCalledTimes(4);
      map.delete('key');
      await nextTick();

      expect(dummy).toBe(undefined);
      expect(mapSpy).toHaveBeenCalledTimes(4);
      map.clear();
      await nextTick();

      expect(dummy).toBe(undefined);
      expect(mapSpy).toHaveBeenCalledTimes(4);
    });

    it('should not observe raw data', async () => {
      let dummy;
      let map;
      const Comp = $unison(() => {
        map = reactive(new Map());
        effect(() => (dummy = toRaw(map).get('key')));
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(undefined);
      map.set('key', 'Hello');
      await nextTick();

      expect(dummy).toBe(undefined);
      map.delete('key');
      await nextTick();

      expect(dummy).toBe(undefined);
    });

    it('should not pollute original Map with Proxies', async () => {
      let map;
      let observed;
      let value;

      const Comp = $unison(() => {
        map = new Map();
        observed = reactive(map);
        value = reactive({});

        return () => <div />;
      });

      render(<Comp />);
      observed.set('key', value);
      await nextTick();

      expect(map.get('key')).not.toBe(value);
      expect(map.get('key')).toBe(toRaw(value));
    });

    it('should return observable versions of contained values', async () => {
      let observed;
      let value;
      let wrapped;
      const Comp = $unison(() => {
        observed = reactive(new Map());
        value = {};
        return () => <div />;
      });

      render(<Comp />);
      act(() => {
        observed.set('key', value);
        wrapped = observed.get('key');
      });
      expect(isReactive(wrapped)).toBe(true);
      expect(toRaw(wrapped)).toBe(value);
    });

    it('should observed nested data', async () => {
      let observed;
      let dummy;
      const Comp = $unison(() => {
        observed = reactive(new Map());
        observed.set('key', { a: 1 });
        effect(() => {
          dummy = observed.get('key').a;
        });
        return () => <div />;
      });

      render(<Comp />);
      observed.get('key').a = 2;
      await nextTick();

      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (forEach)', async () => {
      let map;
      let dummy: any;

      const Comp = $unison(() => {
        map = reactive(new Map([[1, { foo: 1 }]]));
        effect(() => {
          dummy = 0;
          map.forEach((value) => {
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          });
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);
      map.get(1)!.foo++;
      await nextTick();

      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (values)', async () => {
      let map;
      let dummy: any;

      const Comp = $unison(() => {
        map = reactive(new Map([[1, { foo: 1 }]]));
        effect(() => {
          dummy = 0;
          for (const value of map.values()) {
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          }
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);

      map.get(1)!.foo++;
      await nextTick();

      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (entries)', async () => {
      let key;
      let map;
      let dummy: any;

      const Comp = $unison(() => {
        key = {};
        map = reactive(new Map([[key, { foo: 1 }]]));
        effect(() => {
          dummy = 0;
          for (const [key, value] of map.entries()) {
            key;
            expect(isReactive(key)).toBe(true);
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          }
        });

        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);
      map.get(1)!.foo++;
      await nextTick();

      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (for...of)', async () => {
      let key;
      let map;
      let dummy: any;

      const Comp = $unison(() => {
        key = {};
        map = reactive(new Map([[key, { foo: 1 }]]));
        effect(() => {
          dummy = 0;
          for (const [key, value] of map) {
            key;
            expect(isReactive(key)).toBe(true);
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          }
        });

        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);
      map.get(key)!.foo++;
      await nextTick();

      expect(dummy).toBe(2);
    });

    it('should not be trigger when the value and the old value both are NaN', async () => {
      let map;
      let mapSpy;

      const Comp = $unison(() => {
        map = reactive(new Map([['foo', NaN]]));
        mapSpy = vi.fn(() => map.get('foo'));
        effect(mapSpy);
        return () => <div />;
      });

      render(<Comp />);
      map.set('foo', NaN);
      await nextTick();

      expect(mapSpy).toHaveBeenCalledTimes(1);
    });

    it('should work with reactive keys in raw map', async () => {
      const raw = new Map();
      const key = reactive({});
      raw.set(key, 1);
      const map = reactive(raw);

      expect(map.has(key)).toBe(true);
      expect(map.get(key)).toBe(1);

      expect(map.delete(key)).toBe(true);
      expect(map.has(key)).toBe(false);
      expect(map.get(key)).toBeUndefined();
    });

    it('should track set of reactive keys in raw map', async () => {
      let raw;
      let key;
      let map;

      let dummy;

      const Comp = $unison(() => {
        raw = new Map();
        key = reactive({});
        raw.set(key, 1);
        map = reactive(raw);

        effect(() => {
          dummy = map.get(key);
        });

        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);
      map.set(key, 2);
      await nextTick();

      expect(dummy).toBe(2);
    });

    it('should track deletion of reactive keys in raw map', async () => {
      let raw;
      let key;
      let map;

      let dummy;
      const Comp = $unison(() => {
        raw = new Map();
        key = reactive({});
        raw.set(key, 1);
        map = reactive(raw);

        effect(() => {
          dummy = map.has(key);
        });

        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(true);
      map.delete(key);
      await nextTick();

      expect(dummy).toBe(false);
    });

    it('should warn when both raw and reactive versions of the same object is used as key', async () => {
      const raw = new Map();
      const rawKey = {};
      const key = reactive(rawKey);
      raw.set(rawKey, 1);
      raw.set(key, 1);
      const map = reactive(raw);
      map.set(key, 2);
      expect(`Reactive Map contains both the raw and reactive`).toHaveBeenWarned();
    });

    // #877
    it('should not trigger key iteration when setting existing keys', async () => {
      let map;
      let spy;

      const Comp = $unison(() => {
        map = reactive(new Map());
        spy = vi.fn();

        effect(() => {
          const keys = [];
          for (const key of map.keys()) {
            keys.push(key);
          }
          spy(keys);
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toMatchObject([]);

      map.set('a', 0);
      await nextTick();

      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[1][0]).toMatchObject(['a']);

      map.set('b', 0);
      await nextTick();

      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy.mock.calls[2][0]).toMatchObject(['a', 'b']);

      // keys didn't change, should not trigger
      map.set('b', 1);
      await nextTick();

      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('should trigger Map.has only once for non-reactive keys', async () => {
      const [proxy, spy] = coverCollectionFn(new Map(), 'has');
      proxy.has('k');
      expect(spy).toBeCalledTimes(1);
    });

    it('should trigger Map.set only once for non-reactive keys', async () => {
      const [proxy, spy] = coverCollectionFn(new Map(), 'set');
      proxy.set('k', 'v');
      expect(spy).toBeCalledTimes(1);
    });

    it('should trigger Map.delete only once for non-reactive keys', async () => {
      const [proxy, spy] = coverCollectionFn(new Map(), 'delete');
      proxy.delete('foo');
      expect(spy).toBeCalledTimes(1);
    });

    it('should trigger Map.clear only once for non-reactive keys', async () => {
      const [proxy, spy] = coverCollectionFn(new Map(), 'clear');
      proxy.clear();
      expect(spy).toBeCalledTimes(1);
    });

    it('should return proxy from Map.set call', async () => {
      const map = reactive(new Map());
      const result = map.set('a', 'a');
      expect(result).toBe(map);
    });
  });
});
