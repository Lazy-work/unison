import { act, render } from '@testing-library/react';
import { type Ref, hasInjectionContext, reactive, readonly, ref, $bridge, nextTick, createApp } from '../src/index.js';
import { inject, provide } from '../src/index.js';
import { type InjectionKey } from '../src/index.js';
import { nodeOps, serialize } from '@vue/runtime-test';

// reference: https://vue-composition-api-rfc.netlify.com/api.html#provide-inject
describe('api: provide/inject', () => {
  it('string keys', () => {
    const Provider = $bridge(() => {
      provide('foo', 1);
      return () => <Middle />;
    });

    function Middle() {
      return <Consumer />;
    }

    const Consumer = $bridge(() => {
      const foo = inject('foo');
      return () => <div>{foo}</div>;
    });

    const { container } = render(<Provider />);
    expect(container.innerHTML).toBe(`<div>1</div>`);
  });

  it('symbol keys', () => {
    // also verifies InjectionKey type sync
    const key: InjectionKey<number> = Symbol();

    const Provider = $bridge(() => {
      provide(key, 1);
      return () => <Middle />;
    });

    function Middle() {
      return <Consumer />;
    }

    const Consumer = $bridge(() => {
      const foo = inject(key) || 1;
      return () => <div>{foo + 1}</div>;
    });

    const { container } = render(<Provider />);
    expect(container.innerHTML).toBe(`<div>2</div>`);
  });

  it('default values', () => {
    const Provider = $bridge(() => {
      provide('foo', 'foo');
      return () => <Middle />;
    });

    function Middle() {
      return <Consumer />;
    }

    const Consumer = $bridge(() => {
      // default value should be ignored if value is provided
      const foo = inject('foo', 'fooDefault');
      // default value should be used if value is not provided
      const bar = inject('bar', 'bar');
      return () => <div>{foo + bar}</div>;
    });

    const { container } = render(<Provider />);
    expect(container.innerHTML).toBe(`<div>foobar</div>`);
  });

  it.skip('bound to instance', () => {
    const Provider = {
      setup() {
        return () => h(Consumer);
      },
    };

    const Consumer = defineComponent({
      name: 'Consumer',
      inject: {
        foo: {
          from: 'foo',
          default() {
            return this!.$options.name;
          },
        },
      },
      render() {
        return this.foo;
      },
    });

    const root = nodeOps.createElement('div');
    render(h(Provider), root);
    expect(serialize(root)).toBe(`<div>Consumer</div>`);
  });

  it('nested providers', () => {
    const ProviderOne = $bridge(() => {
      // override parent value
      provide('foo', 'foo');
      provide('bar', 'bar');
      return () => <ProviderTwo />;
    });

    const ProviderTwo = $bridge(() => {
      provide('foo', 'fooOverride');
      provide('baz', 'baz');
      return () => <Consumer />;
    });

    const Consumer = $bridge(() => {
      const foo = inject('foo');
      const bar = inject('bar');
      const baz = inject('baz');
      return () => <div>{[foo, bar, baz].join(',')}</div>;
    });

    const { container } = render(<ProviderOne />);
    expect(container.innerHTML).toBe(`<div>fooOverride,bar,baz</div>`);
  });

  it('reactivity with refs', async () => {
    const count = ref(1);

    const Provider = $bridge(() => {
      provide('count', count);
      return () => <Middle />;
    });

    function Middle() {
      return <Consumer />;
    }

    const Consumer = $bridge(() => {
      const count = inject<Ref<number>>('count')!;
      return () => <div>{count.value}</div>;
    });

    const { container } = render(<Provider />);
    expect(container.innerHTML).toBe(`<div>1</div>`);
    // expect(serialize(root)).toBe(`<div>1</div>`)

    act(() => {
      count.value++;
    });
    expect(container.innerHTML).toBe(`<div>2</div>`);
    // expect(serialize(root)).toBe(`<div>2</div>`);
  });

  it('reactivity with readonly refs', async () => {
    const count = ref(1);

    const Provider = $bridge(() => {
      provide('count', readonly(count));
      return () => <Middle />;
    });

    function Middle() {
      return <Consumer />;
    }

    const Consumer = $bridge(() => {
      const count = inject<Ref<number>>('count')!;
      // should not work
      count.value++;
      return () => <div>{count.value}</div>;
    });

    const { container } = render(<Provider />);
    expect(container.innerHTML).toBe(`<div>1</div>`);

    expect(`Set operation on key "value" failed: target is readonly`).toHaveBeenWarned();

    act(() => {
      // source mutation should still work
      count.value++;
    });
    expect(container.innerHTML).toBe(`<div>2</div>`);
  });

  it('reactivity with objects', async () => {
    const rootState = reactive({ count: 1 });

    const Provider = $bridge(() => {
      provide('state', rootState);
      return () => <Middle />;
    });

    function Middle() {
      return <Consumer />;
    }

    const Consumer = $bridge(() => {
      const state = inject<typeof rootState>('state')!;
      return () => <div>{state.count}</div>;
    });

    const { container } = render(<Provider />);
    expect(container.innerHTML).toBe(`<div>1</div>`);

    rootState.count++;
    await nextTick();

    expect(container.innerHTML).toBe(`<div>2</div>`);
  });

  it('reactivity with readonly objects', async () => {
    const rootState = reactive({ count: 1 });

    const Provider = $bridge(() => {
      provide('state', readonly(rootState));
      return () => <Middle />;
    });

    function Middle() {
      return <Consumer />;
    }

    const Consumer = $bridge(() => {
      const state = inject<typeof rootState>('state')!;
      // should not work
      state.count++;
      return () => state.count;
    });

    const root = document.createElement('div');
    render(<Provider />, { container: root });
    expect(root.outerHTML).toBe(`<div>1</div>`);

    expect(`Set operation on key "count" failed: target is readonly`).toHaveBeenWarned();

    rootState.count++;
    await nextTick();
    expect(root.outerHTML).toBe(`<div>2</div>`);
  });

  it('should warn unfound', () => {
    function Provider() {
      return <Middle />;
    }

    function Middle() {
      return <Consumer />;
    }

    const Consumer = $bridge(() => {
      const foo = inject('foo');
      expect(foo).toBeUndefined();
      return () => foo;
    });

    const root = document.createElement('div');
    createApp();
    render(<Provider />, { container: root });
    expect(root.outerHTML).toBe(`<div></div>`);
    expect(`injection "foo" not found.`).toHaveBeenWarned();
  });

  it('should not warn when default value is undefined', () => {
    function Provider() {
      return <Middle />;
    }

    function Middle() {
      return <Consumer />;
    }

    const Consumer = $bridge(() => {
      const foo = inject('foo', undefined);
      return () => foo;
    });
    const root = document.createElement('div');
    render(<Provider />, { container: root });
    expect(`injection "foo" not found.`).not.toHaveBeenWarned();
  });

  // #2400
  it('should not self-inject', () => {
    const Comp = $bridge(() => {
      provide('foo', 'foo');
      const injection = inject('foo', null);
      return () => injection;
    });

    const root = document.createElement('div');
    render(<Comp />, { container: root });
    expect(root.outerHTML).toBe(`<div></div>`);
  });

  describe('hasInjectionContext', () => {
    it('should be false outside of setup', () => {
      expect(hasInjectionContext()).toBe(false);
    });

    it('should be true within setup', () => {
      expect.assertions(1);
      const Comp = $bridge(() => {
        expect(hasInjectionContext()).toBe(true);
        return () => null;
      });

      const root = document.createElement('div');
      render(<Comp />, { container: root });
    });

    it('should be true within app.runWithContext()', () => {
      expect.assertions(1);
      createApp().runWithContext(() => {
        expect(hasInjectionContext()).toBe(true);
      });
    });
  });
});
