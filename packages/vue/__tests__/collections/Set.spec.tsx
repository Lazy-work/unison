import { watchEffect as effect, isReactive, reactive, toRaw, nextTick } from '../../src';
import { $bridge } from '@briddge/core';
import { act, render } from '@testing-library/react';

describe('reactivity/collections', () => {
  function coverCollectionFn(collection: Set<any>, fnName: string) {
    const spy = vi.fn();
    const proxy = reactive(collection);
    (collection as any)[fnName] = spy;
    return [proxy as any, spy];
  }

  describe('Set', () => {
    it('should observe mutations', async () => {
      let dummy;
      let set;
      const Comp = $bridge(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.has('value')));
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);
      set.add('value');
      await nextTick();
      expect(dummy).toBe(true);
      set.delete('value');
      await nextTick();
      expect(dummy).toBe(false);
    });

    it('should observe mutations with observed value', async () => {
      let dummy;
      let value;
      let set;
      const Comp = $bridge(() => {
        value = reactive({});
        set = reactive(new Set());
        effect(() => (dummy = set.has(value)));
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(false);

      set.add(value);
      await nextTick();
      expect(dummy).toBe(true);
      set.delete(value);
      await nextTick();
      expect(dummy).toBe(false);
    });

    it('should observe for of iteration', async () => {
      let dummy;
      let set;

      const Comp = $bridge(() => {
        set = reactive(new Set() as Set<number>);
        effect(() => {
          dummy = 0;
          for (const num of set) {
            dummy += num;
          }
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);

      set.add(2);
      set.add(1);
      await nextTick();

      expect(dummy).toBe(3);

      set.delete(2);
      await nextTick();

      expect(dummy).toBe(1);

      set.clear();
      await nextTick();
      expect(dummy).toBe(0);
    });

    it('should observe forEach iteration', async () => {
      let dummy: any;
      let set;
      const Comp = $bridge(() => {
        set = reactive(new Set());
        effect(() => {
          dummy = 0;
          set.forEach((num) => (dummy += num));
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(0);
      set.add(2);
      set.add(1);
      await nextTick();
      
      expect(dummy).toBe(3);

      set.delete(2);
      await nextTick();

      expect(dummy).toBe(1);
      
      set.clear();
      await nextTick();
      
      expect(dummy).toBe(0);
    });

    it('should observe values iteration', async () => {
      let dummy;
      let set;

      const Comp = $bridge(() => {
        set = reactive(new Set() as Set<number>);
        effect(() => {
          dummy = 0;
          for (const num of set.values()) {
            dummy += num;
          }
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);

      set.add(2);
      set.add(1);
      await nextTick();

      expect(dummy).toBe(3);

      set.delete(2);
      await nextTick();

      expect(dummy).toBe(1);

      set.clear();
      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should observe keys iteration', async () => {
      let dummy;
      let set;
      const Comp = $bridge(() => {
        set = reactive(new Set() as Set<number>);
        effect(() => {
          dummy = 0;
          for (const num of set.keys()) {
            dummy += num;
          }
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);

      set.add(2);
      set.add(1);
      await nextTick();

      expect(dummy).toBe(3);

      set.delete(2);
      await nextTick();

      expect(dummy).toBe(1);

      set.clear();
      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should observe entries iteration', async () => {
      let dummy;
      let set;

      const Comp = $bridge(() => {
        set = reactive(new Set<number>());
        effect(() => {
          dummy = 0;
          for (const [key, num] of set.entries()) {
            key;
            dummy += num;
          }
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);

      set.add(2);
      set.add(1);
      await nextTick();

      expect(dummy).toBe(3);

      set.delete(2);
      await nextTick();

      expect(dummy).toBe(1);

      set.clear();
      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should be triggered by clearing', async () => {
      let dummy;
      let set;
      const Comp = $bridge(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.has('key')));
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);

      set.add('key');
      await nextTick();

      expect(dummy).toBe(true);

      set.clear();
      await nextTick();

      expect(dummy).toBe(false);
    });

    it('should not observe custom property mutations', async () => {
      let dummy;
      let set: any;

      const Comp = $bridge(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.customProp));
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(undefined);

      set.customProp = 'Hello World';
      await nextTick();

      expect(dummy).toBe(undefined);
    });

    it('should observe size mutations', async () => {
      let dummy;
      let set;

      const Comp = $bridge(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.size));
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);

      set.add('value');
      set.add('value2');
      await nextTick();

      expect(dummy).toBe(2);

      set.delete('value');
      await nextTick();

      expect(dummy).toBe(1);

      set.clear();
      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should not observe non value changing mutations', async () => {
      let dummy;
      let set;
      let setSpy;

      const Comp = $bridge(() => {
        set = reactive(new Set());
        setSpy = vi.fn(() => (dummy = set.has('value')));
        effect(setSpy);
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(1);

      set.add('value');
      await nextTick();

      expect(dummy).toBe(true);
      expect(setSpy).toHaveBeenCalledTimes(2);

      set.add('value');
      await nextTick();

      expect(dummy).toBe(true);
      expect(setSpy).toHaveBeenCalledTimes(2);

      set.delete('value');
      await nextTick();

      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(3);

      set.delete('value');
      await nextTick();

      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(3);

      set.clear();
      await nextTick();

      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(3);
    });

    it('should not observe raw data', async () => {
      let dummy;
      let set;

      const Comp = $bridge(() => {
        set = reactive(new Set());
        effect(() => (dummy = toRaw(set).has('value')));

        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);

      set.add('value');
      await nextTick();

      expect(dummy).toBe(false);
    });

    it('should not observe raw iterations', async () => {
      let dummy = 0;
      let set;

      const Comp = $bridge(() => {
        set = reactive(new Set<number>());
        effect(() => {
          dummy = 0;
          for (const [num] of toRaw(set).entries()) {
            dummy += num;
          }
          for (const num of toRaw(set).keys()) {
            dummy += num;
          }
          for (const num of toRaw(set).values()) {
            dummy += num;
          }
          toRaw(set).forEach((num) => {
            dummy += num;
          });
          for (const num of toRaw(set)) {
            dummy += num;
          }
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);

      set.add(2);
      set.add(3);
      await nextTick();

      expect(dummy).toBe(0);

      set.delete(2);
      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should not be triggered by raw mutations', async () => {
      let dummy;
      let set;

      const Comp = $bridge(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.has('value')));
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);

      toRaw(set).add('value');
      await nextTick();

      expect(dummy).toBe(false);

      dummy = true;
      toRaw(set).delete('value');
      await nextTick();

      expect(dummy).toBe(true);

      toRaw(set).clear();
      await nextTick();

      expect(dummy).toBe(true);
    });

    it('should not observe raw size mutations', async () => {
      let dummy;
      let set;

      const Comp = $bridge(() => {
        set = reactive(new Set());
        effect(() => (dummy = toRaw(set).size));
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(0);

      set.add('value');
      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should not be triggered by raw size mutations', async () => {
      let dummy;
      let set;

      const Comp = $bridge(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.size));

        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);

      toRaw(set).add('value');
      await nextTick();

      expect(dummy).toBe(0);
    });

    it('should support objects as key', async () => {
      let dummy;
      let key;
      let set;
      let setSpy;

      const Comp = $bridge(() => {
        key = {};
        set = reactive(new Set());
        setSpy = vi.fn(() => (dummy = set.has(key)));
        effect(setSpy);

        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(1);

      set.add({});
      await nextTick();

      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(1);

      set.add(key);
      await nextTick();

      expect(dummy).toBe(true);
      expect(setSpy).toHaveBeenCalledTimes(2);
    });

    it('should not pollute original Set with Proxies', () => {
      const set = new Set();
      const observed = reactive(set);
      const value = reactive({});
      observed.add(value);
      expect(observed.has(value)).toBe(true);
      expect(set.has(value)).toBe(false);
    });

    it('should observe nested values in iterations (forEach)', async () => {
      let set;
      let dummy: any;

      const Comp = $bridge(() => {
        set = reactive(new Set([{ foo: 1 }]));
        effect(() => {
          dummy = 0;
          set.forEach((value) => {
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          });
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);

      set.forEach((value) => {
        value.foo++;
      });
      await nextTick();

      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (values)', async () => {
      let set;
      let dummy: any;

      const Comp = $bridge(() => {
        set = reactive(new Set([{ foo: 1 }]));
        effect(() => {
          dummy = 0;
          for (const value of set.values()) {
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          }
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);

      set.forEach((value) => {
        value.foo++;
      });
      await nextTick();

      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (entries)', async () => {
      let set;
      let dummy: any;

      const Comp = $bridge(() => {
        set = reactive(new Set([{ foo: 1 }]));
        effect(() => {
          dummy = 0;
          for (const [key, value] of set.entries()) {
            expect(isReactive(key)).toBe(true);
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          }
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);

      set.forEach((value) => {
        value.foo++;
      });
      await nextTick();

      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (for...of)', async () => {
      let set;
      let dummy: any;

      const Comp = $bridge(() => {
        set = reactive(new Set([{ foo: 1 }]));
        effect(() => {
          dummy = 0;
          for (const value of set) {
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          }
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);

      set.forEach((value) => {
        value.foo++;
      });
      await nextTick();

      expect(dummy).toBe(2);
    });

    it('should track deletion of reactive entries in raw set', async () => {
      let raw;
      let entry;
      let set;

      let dummy;

      const Comp = $bridge(() => {
        raw = new Set();
        entry = reactive({});
        raw.add(entry);
        set = reactive(raw);
        effect(() => {
          dummy = set.has(entry);
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(true);

      set.delete(entry);
      await nextTick();

      expect(dummy).toBe(false);
    });
  });
});
