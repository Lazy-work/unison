import { render } from '@testing-library/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { $unison, watchEffect, toUnisonHook, nextTick, ref } from '../src/index';

type Action = 'body' | 'effect (pre)' | 'effect (post)' | 'hook' | 'render';

describe('toUnisonHook test suite', () => {
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
    const events: Action[] = [];
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

    const counter = container.querySelector('#action') as HTMLButtonElement;

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

    const events: Action[] = [];
    const Comp = $unison(() => {
      booleanValue();
      const counter = ref(0);

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

    const counter = container.querySelector('#action') as HTMLButtonElement;

    counter.click();
    await nextTick();
    expect(events).toEqual(['render', 'render']);
  });
  it("should track react hook's result (shallow)", async () => {
    function useValue() {
      const [state, setState] = useState({ value: 1 });

      useEffect(() => {
        const timeout = setTimeout(() => void setState({ value: 2 }), 30);

        return () => clearTimeout(timeout);
      }, []);

      return state;
    }

    const value = toUnisonHook(useValue);

    let dummy;
    const events: Action[] = [];
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

    await new Promise((res) => setTimeout(res, 30));

    expect(dummy.value).toBe(2);
    expect(events).toEqual(['render', 'render']);
  });

  it("should not track react hook's result deeply (shallow)", async () => {
    function useBooleanValue() {
      const [state, setState] = useState(false);

      const mutate = useCallback(() => {
        setState((value) => !value);
      }, []);

      return useMemo(() => ({ value: state, mutate }), []);
    }

    const booleanValue = toUnisonHook(useBooleanValue, { shallow: true });

    let dummy;
    const events: Action[] = [];
    const VueComponent = $unison(() => {
      const result = booleanValue();

      watchEffect(() => {
        events.push('effect (pre)');
        dummy = result.value.value;
      });

      return () => {
        events.push('render');
        return (
          <button id="action" onClick={result.value.mutate}>
            Action : {result.value.value}
          </button>
        );
      };
    });

    const { container } = render(<VueComponent />);

    const counter = container.querySelector('#action') as HTMLButtonElement;

    expect(dummy).toBeDefined();

    let prev = dummy;
    counter.click();
    await nextTick();

    expect(dummy).toBe(prev);
    expect(events).toEqual(['effect (pre)', 'render']);
  });

  it('should run hook when no effects is declared', async () => {
    const events: Action[] = [];
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
      const count = ref(0);
      booleanValue();

      function increment() {
        count.value++;
      }
      return () => {
        events.push('render');
        return (
          <button id="action" onClick={increment}>
            Action : {count.value}
          </button>
        );
      };
    });

    const { container } = render(<Comp />);

    const counter = container.querySelector('#action') as HTMLButtonElement;

    counter.click();
    await nextTick();
    expect(events).toEqual(['hook', 'render', 'hook', 'render']);
  });
});
