/** @import {Action} from "./type" */
import React from 'react';
import { render } from '@testing-library/react';
import { onBeforeMount, onBeforeUpdate, onMounted, onUnmounted, onUpdated } from '../src/lifecycle';
import Ref from './mocks/ref/ref';
import { $unison } from '../src/management';
import { getMode, nextTick } from '#vue-internals/runtime-core/scheduler';
import { watchEffect, watchPostEffect } from './mocks/effect';

describe('testing scheduling with react', () => {
  it('should flush jobs according to the React scheduling', async () => {
    /** @type {Action[]} */
    const events = [];

    const Counter = $unison(() => {
      const count = new Ref(0);
      events.push('body');

      function onClick() {
        count.value++;
      }

      watchEffect(() => {
        events.push('effect (pre)');
        count.value;
      });

      return () => {
        events.push('render');
        return (
          <button id="action" onClick={onClick}>
            count is {count.value}
          </button>
        );
      };
    });
    const root = document.createElement('div');
    render(<Counter />, { container: root });

    /** @type {HTMLButtonElement} */
    const counter = root.querySelector('#action');

    counter.click();
    await nextTick();

    expect(events).toEqual(['body', 'effect (pre)', 'render', 'effect (pre)', 'render']);
  });
  it('should effect after render', async () => {
    /** @type {Action[]} */
    const events = [];

    const Counter = $unison(() => {
      const count = new Ref(0);
      events.push('body');

      function onClick() {
        count.value++;
      }

      watchPostEffect(() => {
        events.push('effect (post)');
        count.value;
      });

      return () => {
        events.push('render');
        return (
          <button id="action" onClick={onClick}>
            count is {count.value}
          </button>
        );
      };
    });
    const root = document.createElement('div');
    render(<Counter />, { container: root });

    /** @type {HTMLButtonElement} */
    const counter = root.querySelector('#action');

    counter.click();
    await nextTick();

    expect(events).toEqual(['body', 'render', 'effect (post)', 'render', 'effect (post)']);
  });
  it('should remain in auto flushing mode after first render', async () => {
    /** @type {Action[]} */
    const events = [];

    const Counter = $unison(() => {
      const count = new Ref(0);
      events.push('body');

      function onClick() {
        count.value++;
      }

      watchEffect(() => {
        events.push('effect (pre)');
        count.value;
      });

      return () => {
        events.push('render');
        return (
          <button id="action" onClick={onClick}>
            Increment
          </button>
        );
      };
    });
    const root = document.createElement('div');
    render(<Counter />, { container: root });

    /** @type {HTMLButtonElement} */
    const counter = root.querySelector('#action');

    expect(getMode()).toBe('auto');
    counter.click();
    await nextTick();

    expect(getMode()).toBe('auto');
    expect(events).toEqual(['body', 'effect (pre)', 'render', 'effect (pre)']);
  });
  it('should return to auto flushing mode after React related jobs flushed', async () => {
    /** @type {Action[]} */
    const events = [];

    const Counter = $unison(() => {
      const count = new Ref(0);
      const toggle = new Ref(false);
      events.push('body');

      function onClick() {
        count.value++;
      }
      function onToggle() {
        toggle.value = !toggle.value;
      }

      watchEffect(() => {
        events.push('effect (pre)');
        count.value;
        toggle.value;
      });

      return () => {
        events.push('render');
        return (
          <>
            <button id="toggle" onClick={onToggle} />
            <button id="action" onClick={onClick}>
              count is {count.value}
            </button>
          </>
        );
      };
    });
    const root = document.createElement('div');
    render(<Counter />, { container: root });

    /** @type {HTMLButtonElement} */
    const counter = root.querySelector('#action');

    /** @type {HTMLButtonElement} */
    const toggleBtn = root.querySelector('#toggle');

    counter.click();
    expect(getMode()).toBe('manual');
    await nextTick();

    expect(getMode()).toBe('auto');
    toggleBtn.click();
    await nextTick();

    expect(getMode()).toBe('auto');

    toggleBtn.click();
    await nextTick();
    expect(getMode()).toBe('auto');

    expect(events).toEqual([
      'body',
      'effect (pre)',
      'render',
      'effect (pre)',
      'render',
      'effect (pre)',
      'effect (pre)',
    ]);
  });
  it('should alternate between auto and manuel consicely according to the queuing and flushing from React related jobs', async () => {
    /** @type {Action[]} */
    const events = [];

    const Counter = $unison(() => {
      const count = new Ref(0);
      const toggle = new Ref(false);
      events.push('body');

      function onClick() {
        count.value++;
      }
      function onToggle() {
        toggle.value = !toggle.value;
      }

      watchEffect(() => {
        events.push('effect (pre)');
        count.value;
        toggle.value;
      });

      return () => {
        events.push('render');
        return (
          <>
            <button id="toggle" onClick={onToggle} />
            <button id="action" onClick={onClick}>
              count is {count.value}
            </button>
          </>
        );
      };
    });
    const root = document.createElement('div');
    render(<Counter />, { container: root });

    /** @type {HTMLButtonElement} */
    const counter = root.querySelector('#action');

    /** @type {HTMLButtonElement} */
    const toggleBtn = root.querySelector('#toggle');

    counter.click();
    expect(getMode()).toBe('manual');
    await nextTick();

    expect(getMode()).toBe('auto');
    toggleBtn.click();
    await nextTick();

    expect(getMode()).toBe('auto');

    toggleBtn.click();
    await nextTick();
    expect(getMode()).toBe('auto');

    counter.click();
    expect(getMode()).toBe('manual');
    await nextTick();

    toggleBtn.click();
    await nextTick();
    expect(getMode()).toBe('auto');

    toggleBtn.click();
    await nextTick();
    expect(getMode()).toBe('auto');

    expect(events).toEqual([
      'body',
      'effect (pre)',
      'render',
      'effect (pre)',
      'render',
      'effect (pre)',
      'effect (pre)',
      'effect (pre)',
      'render',
      'effect (pre)',
      'effect (pre)',
    ]);
  });

  it('should handle flush tracking with rendering only', async () => {
    const state = new Ref(1);

    const Comp = $unison(() => {
      return () => state.value;
    });

    const root = document.createElement('div');
    render(<Comp />, { container: root });
    expect(root.outerHTML).toBe(`<div>1</div>`);

    state.value++;
    await nextTick();
    expect(root.outerHTML).toBe(`<div>2</div>`);
  });

  it('should run onMounted hook after render', async () => {
    /** @type {HTMLParagraphElement | null} */
    let tmp;

    /** @type {string | undefined} */
    let innerHTML;

    const Comp = $unison(() => {
      onMounted(() => {
        innerHTML = tmp?.innerHTML;
      });

      return () => <p ref={(el) => (tmp = el)}>this is a component</p>;
    });

    render(<Comp />);
    expect(innerHTML).toBe('this is a component');
  });
  it('should run onBeforeUpdate hook before updating template', async () => {
    /** @type {HTMLButtonElement | null} */
    let tmp;

    /** @type {string | undefined} */
    let innerHTML;

    const Counter = $unison(() => {
      const count = new Ref(0);

      onBeforeUpdate(() => {
        innerHTML = tmp?.innerHTML;
      });

      function onClick() {
        count.value++;
      }

      return () => (
        <button ref={(el) => (tmp = el)} id="action" onClick={onClick}>
          count is {count.value}
        </button>
      );
    });

    const root = document.createElement('div');
    render(<Counter />, { container: root });

    /** @type {HTMLButtonElement} */
    const counter = root.querySelector('#action');

    counter.click();
    await nextTick();

    expect(innerHTML).toBe('count is 0');

    counter.click();
    await nextTick();

    expect(innerHTML).toBe('count is 1');
  });
  it('should run onUpdated hook after updating template', async () => {
    /** @type {HTMLButtonElement | null} */
    let tmp;

    /** @type {string | undefined} */
    let innerHTML;

    const Counter = $unison(() => {
      const count = new Ref(0);

      onUpdated(() => {
        innerHTML = tmp?.innerHTML;
      });

      function onClick() {
        count.value++;
      }

      return () => (
        <button ref={(el) => (tmp = el)} id="action" onClick={onClick}>
          count is {count.value}
        </button>
      );
    });

    const root = document.createElement('div');
    render(<Counter />, { container: root });

    /** @type {HTMLButtonElement} */
    const counter = root.querySelector('#action');

    counter.click();
    await nextTick();

    expect(innerHTML).toBe('count is 1');

    counter.click();
    await nextTick();

    expect(innerHTML).toBe('count is 2');
  });
  it('should run onUnmounted hook after unmount', async () => {
    let tmp = 'mounted';

    const Counter = $unison(() => {
      onUnmounted(() => {
        tmp = 'unmounted';
      });

      return () => <p>this is a component</p>;
    });

    const root = document.createElement('div');
    const { unmount } = render(<Counter />, { container: root });

    expect(tmp).toBe('mounted');
    expect(root.outerHTML).toBe('<div><p>this is a component</p></div>');

    unmount();

    expect(tmp).toBe('unmounted');
    expect(root.outerHTML).toBe('<div></div>');
  });
});
