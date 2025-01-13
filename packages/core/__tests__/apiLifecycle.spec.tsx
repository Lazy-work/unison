import React from 'react'
import { render } from '@testing-library/react';
import {
  $unison,
  // KeepAlive,
  // TrackOpTypes,
  nextTick,
  // onActivated,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  onRenderTracked,
  onRenderTriggered,
  onUnmounted,
  onUpdated,
} from '../src/index';
// import { type DebuggerEvent, ITERATE_KEY, TriggerOpTypes } from '@vue/reactivity';
import Ref from './mocks/ref/ref';

describe('api: lifecycle hooks', () => {
  it('onBeforeMount', () => {
    const fn = vi.fn(() => {
      // should be called before inner div is rendered
      expect(root.innerHTML).toBe(``);
    });

    const Comp = $unison(() => {
      onBeforeMount(fn);
      return () => <div />;
    });

    const root = document.createElement('div');
    render(<Comp />, { container: root });
    expect(fn).toHaveBeenCalledTimes(1);
    // #10863
    expect(fn).toHaveBeenCalledWith();
  });

  it('onMounted', () => {
    const fn = vi.fn(() => {
      // should be called after inner div is rendered
      expect(root.innerHTML).toBe(`<div></div>`);
    });

    const Comp = $unison(() => {
      onMounted(fn);
      return () => <div />;
    });
    const root = document.createElement('div');
    render(<Comp />, { container: root });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('onBeforeUpdate', async () => {
    const count = new Ref(0);
    const root = document.createElement('div');
    const fn = vi.fn(() => {
      // should be called before inner div is updated
      expect(root.innerHTML).toBe(`<div>0</div>`);
    });

    const Comp = $unison(() => {
      onBeforeUpdate(fn);
      return () => <div>{count.value}</div>;
    });
    render(<Comp />, { container: root });

    console.log(root.innerHTML);
    count.value++;
    await nextTick();
    console.log(root.innerHTML);
    // expect(fn).toHaveBeenCalledTimes(1);
    // expect(root.innerHTML).toBe(`<div>1</div>`);
  });

  it('state mutation in onBeforeUpdate', async () => {
    const count = new Ref(0);
    const root = document.createElement('div');
    const fn = vi.fn(() => {
      // should be called before inner div is updated
      expect(root.innerHTML).toBe(`<div>0</div>`);
      count.value++;
    });
    const renderSpy = vi.fn();

    const Comp = $unison(() => {
      onBeforeUpdate(fn);
      return () => {
        renderSpy();
        return <div>{count.value}</div>;
      };
    });

    render(<Comp />, { container: root });
    expect(renderSpy).toHaveBeenCalledTimes(1);

    count.value++;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(root.innerHTML).toBe(`<div>2</div>`);
  });

  it('onUpdated', async () => {
    const count = new Ref(0);
    const root = document.createElement('div');

    const fn = vi.fn(() => {
      // should be called after inner div is updated
      expect(root.innerHTML).toBe(`<div>1</div>`);
    });

    const Comp = $unison(() => {
      onUpdated(fn);
      return () => <div>{count.value}</div>;
    });

    render(<Comp />, { container: root });

    count.value++;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('onBeforeUnmount', async () => {
    const toggle = new Ref(true);
    const root = document.createElement('div');
    const fn = vi.fn(() => {
      // should be called before inner div is removed
      expect(root.innerHTML).toBe(`<div></div>`);
    });

    const Child = $unison(() => {
      onBeforeUnmount(fn);
      return () => <div />;
    });

    const Comp = $unison(() => {
      return () => (toggle.value ? <Child /> : null);
    });

    render(<Comp />, { container: root });

    toggle.value = false;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('onUnmounted', async () => {
    const toggle = new Ref(true);
    const fn = vi.fn(() => {
      // should be called after inner div is removed
      expect(root.innerHTML).toBe('');
    });

    const Comp = $unison(() => {
      return () => (toggle.value ? <Child /> : null);
    });

    const Child = $unison(() => {
      onUnmounted(fn);
      return () => <div />;
    });

    const root = document.createElement('div');
    render(<Comp />, { container: root });

    toggle.value = false;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('onBeforeUnmount in onMounted', async () => {
    const toggle = new Ref(true);
    const fn = vi.fn(() => {
      // should be called before inner div is removed
      expect(root.innerHTML).toBe(`<div></div>`);
    });

    const Comp = $unison(() => {
      return () => (toggle.value ? <Child /> : null);
    });

    const Child = $unison(() => {
      onMounted(() => {
        onBeforeUnmount(fn);
      });
      return () => <div />;
    });

    const root = document.createElement('div');
    render(<Comp />, { container: root });

    toggle.value = false;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('lifecycle call order', async () => {
    const count = new Ref(0);
    const calls: string[] = [];

    const Root = $unison(() => {
      onBeforeMount(() => calls.push('root onBeforeMount'));
      onMounted(() => calls.push('root onMounted'));
      onBeforeUpdate(() => calls.push('root onBeforeUpdate'));
      onUpdated(() => calls.push('root onUpdated'));
      onBeforeUnmount(() => calls.push('root onBeforeUnmount'));
      onUnmounted(() => calls.push('root onUnmounted'));
      return () => <Mid count={count.value} />;
    });

    const Mid = $unison<{ count: number }>((props) => {
      onBeforeMount(() => calls.push('mid onBeforeMount'));
      onMounted(() => calls.push('mid onMounted'));
      onBeforeUpdate(() => calls.push('mid onBeforeUpdate'));
      onUpdated(() => calls.push('mid onUpdated'));
      onBeforeUnmount(() => calls.push('mid onBeforeUnmount'));
      onUnmounted(() => calls.push('mid onUnmounted'));
      return () => <Child count={props.count} />;
    });

    const Child = $unison<{ count: number }>((props) => {
      onBeforeMount(() => calls.push('child onBeforeMount'));
      onMounted(() => calls.push('child onMounted'));
      onBeforeUpdate(() => calls.push('child onBeforeUpdate'));
      onUpdated(() => calls.push('child onUpdated'));
      onBeforeUnmount(() => calls.push('child onBeforeUnmount'));
      onUnmounted(() => calls.push('child onUnmounted'));
      return () => <div>{props.count}</div>;
    });

    // mount
    const root = document.createElement('div');
    render(<Root />, { container: root });
    expect(calls).toEqual([
      'root onBeforeMount',
      'mid onBeforeMount',
      'child onBeforeMount',
      'child onMounted',
      'mid onMounted',
      'root onMounted',
    ]);

    calls.length = 0;

    // update
    count.value++;
    await nextTick();
    expect(calls).toEqual([
      'root onBeforeUpdate',
      'mid onBeforeUpdate',
      'child onBeforeUpdate',
      'child onUpdated',
      'mid onUpdated',
      'root onUpdated',
    ]);

    calls.length = 0;

    // unmount
    render(null, { container: root });
    expect(calls).toEqual([
      'root onBeforeUnmount',
      'mid onBeforeUnmount',
      'child onBeforeUnmount',
      'child onUnmounted',
      'mid onUnmounted',
      'root onUnmounted',
    ]);
  });

  it.skip('onRenderTracked', () => {
    const events: DebuggerEvent[] = [];
    const onTrack = vi.fn((e: DebuggerEvent) => {
      events.push(e);
    });
    const obj = reactive({ foo: 1, bar: 2 });

    const Comp = $unison(() => {
      onRenderTracked(onTrack);
      return () => <div>{[obj.foo, 'bar' in obj, Object.keys(obj).join('')]}</div>;
    });

    render(<Comp />);
    expect(onTrack).toHaveBeenCalledTimes(3);
    expect(events).toMatchObject([
      {
        target: obj,
        type: TrackOpTypes.GET,
        key: 'foo',
      },
      {
        target: obj,
        type: TrackOpTypes.HAS,
        key: 'bar',
      },
      {
        target: obj,
        type: TrackOpTypes.ITERATE,
        key: ITERATE_KEY,
      },
    ]);
  });

  it.skip('onRenderTriggered', async () => {
    const events: DebuggerEvent[] = [];
    const onTrigger = vi.fn((e: DebuggerEvent) => {
      events.push(e);
    });
    const obj = reactive<{
      foo: number;
      bar?: number;
    }>({ foo: 1, bar: 2 });

    const Comp = $unison(() => {
      onRenderTriggered(onTrigger);
      return () => <div>{[obj.foo, 'bar' in obj, Object.keys(obj).join('')]}</div>;
    });

    render(<Comp />);

    obj.foo++;
    await nextTick();
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(events[0]).toMatchObject({
      type: TriggerOpTypes.SET,
      key: 'foo',
      oldValue: 1,
      newValue: 2,
    });

    delete obj.bar;
    await nextTick();
    expect(onTrigger).toHaveBeenCalledTimes(2);
    expect(events[1]).toMatchObject({
      type: TriggerOpTypes.DELETE,
      key: 'bar',
      oldValue: 2,
    });
    (obj as any).baz = 3;
    await nextTick();
    expect(onTrigger).toHaveBeenCalledTimes(3);
    expect(events[2]).toMatchObject({
      type: TriggerOpTypes.ADD,
      key: 'baz',
      newValue: 3,
    });
  });

  it('runs shared hook fn for each instance', async () => {
    const fn = vi.fn();
    const toggle = new Ref(true);
    const Comp = $unison(() => {
      return () => (toggle.value ? [<Child />, <Child />] : null);
    });
    const Child = $unison(() => {
      onMounted(fn);
      onBeforeUnmount(fn);
      return () => <div />;
    });

    render(<Comp />);
    expect(fn).toHaveBeenCalledTimes(2);
    toggle.value = false;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('immediately trigger unmount during rendering', async () => {
    const fn = vi.fn();
    const toggle = new Ref(false);

    const Child = $unison(() => {
      onMounted(fn);
      // trigger unmount immediately
      toggle.value = false;
      return () => <div />;
    });

    const Comp = $unison(() => {
      return () => (toggle.value ? [<Child />] : null);
    });

    render(<Comp />);

    toggle.value = true;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(0);
  });

  it.skip('immediately trigger unmount during rendering(with KeepAlive)', async () => {
    const mountedSpy = vi.fn();
    const activeSpy = vi.fn();
    const toggle = new Ref(false);

    const Child = $unison(() => {
      onMounted(mountedSpy);
      onActivated(activeSpy);

      // trigger unmount immediately
      toggle.value = false;
      return () => <div />;
    });

    const Comp = $unison(() => {
      return () => <KeepAlive>{[toggle.value ? <Child /> : null]}</KeepAlive>;
    });

    render(<Comp />);

    toggle.value = true;
    await nextTick();
    expect(mountedSpy).toHaveBeenCalledTimes(0);
    expect(activeSpy).toHaveBeenCalledTimes(0);
  });
});
