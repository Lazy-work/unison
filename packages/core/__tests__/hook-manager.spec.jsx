/** @import {Action} from "./type" */
/** @import {HookManagerOptions} from "../src/plugins/hook-manager" */
import { $unison, usePlugin } from '../src/management';
import { render } from '@testing-library/react';
import { HookManager, HookManagerOptions, toUnisonHook } from '../src/plugins/hook-manager';
import React, { useCallback, useEffect, useState } from 'react';
import HookRef from './mocks/ref/hook-ref';
import { watchEffect } from './mocks/effect';
import Ref from './mocks/ref/ref';
import { unref } from '@vue-internals/reactivity/ref';
import { nextTick } from '../src';

describe('', () => {
  beforeAll(() => {
    /** @type {HookManagerOptions<any>} */
    const options = { signalClass: HookRef, unsignal: unref };
    usePlugin(HookManager, options);
  });

  it("should track react hook's result object", async () => {
    function useBooleanValue() {
      const [state, setState] = useState(false);

      const mutate = useCallback(() => {
        setState((value) => !value);
      }, []);

      return { value: state, mutate };
    }

    const booleanValue = toUnisonHook(useBooleanValue);

    let dummy;
    /** @type {Action[]} */
    const events = [];
    const Comp = $unison(() => {
      const { value, mutate } = booleanValue();

      watchEffect(() => {
        dummy = value.value;
      });
      return () => {
        events.push('render');
        return (
          <button id="action" onClick={mutate}>
            Action : {value.value}
          </button>
        );
      };
    });

    const { container } = render(<Comp />);

    /** @type {HTMLButtonElement} */
    const counter = container.querySelector('#action');

    expect(dummy).toBe(false);

    counter.click();

    await nextTick();
    expect(dummy).toBe(true);
    expect(events).toEqual(['render', 'render']);
  });

  it('should update once', async () => {
    function useBooleanValue() {
      const [state, setState] = useState(false);

      const mutate = useCallback(() => {
        setState((value) => !value);
      }, []);

      return {};
    }

    const booleanValue = toUnisonHook(useBooleanValue, { shallow: true });

    /** @type {Action[]} */
    const events = [];
    const Comp = $unison(() => {
      booleanValue();
      const counter = new Ref(0);

      return () => {
        events.push('render');
        return (
          <button id="action" onClick={() => counter.value++}>
            counter is {counter.value}
          </button>
        );
      };
    });

    const { container } = render(<Comp />);

    /** @type {HTMLButtonElement} */
    const counter = container.querySelector('#action');

    counter.click();
    await nextTick();
    expect(events).toEqual(['render', 'render']);
  });
  it("should track react hook's result (shallow)", async () => {
    function useValue() {
      const [state, setState] = useState({ value: 1 });

      useEffect(() => {
        const timeout = setTimeout(() => void setState({ value: 2 }), 200);

        return () => clearTimeout(timeout);
      }, []);

      return state;
    }

    const value = toUnisonHook(useValue);

    let dummy;
    /** @type {Action[]} */
    const events = [];
    const VueComponent = $unison(() => {
      const result = value();

      watchEffect(() => {
        dummy = result.value;
      });

      return () => {
        events.push('render');
        return <button id="action">Action : {result.value.value}</button>;
      };
    });

    render(<VueComponent />);

    expect(dummy.value).toBe(1);

    await new Promise((res) => setTimeout(res, 300));

    expect(dummy.value).toBe(2);
    expect(events).toEqual(['render', 'render']);
  });
  it('should run hook when no effects is declared', async () => {
    /** @type {Action[]} */
    const events = [];
    function useBooleanValue() {
      events.push('hook');
      const [state, setState] = useState(false);

      const mutate = useCallback(() => {
        setState((value) => !value);
      }, []);

      return { value: state, mutate };
    }

    const booleanValue = toUnisonHook(useBooleanValue);

    const Comp = $unison(() => {
      const count = new Ref(0);
      const { value, mutate } = booleanValue(count);

      function increment() {
        count.value++;
      }
      return () => {
        events.push('render');
        return (
          <button id="action" onClick={increment}>
            Action : {value.value}
          </button>
        );
      };
    });

    const { container } = render(<Comp />);

    /** @type {HTMLButtonElement} */
    const counter = container.querySelector('#action');

    counter.click();
    await nextTick();
    expect(events).toEqual(['hook', 'render', 'hook']);
  });
});
