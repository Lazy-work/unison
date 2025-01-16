import { act, render } from '@testing-library/react';
import { computed, customRef, reactive, ref, triggerRef, useUnison } from '../src';

describe('useUnison test suite', () => {
  it('should render on ref change', () => {
    const globalCount = ref(0);

    function Counter() {
      useUnison();
      return <button onClick={() => globalCount.value++}>{globalCount.value}</button>;
    }

    const { container } = render(<Counter />);

    const btn = container.querySelector('button') as HTMLButtonElement;

    act(() => {
      btn.click();
    });

    expect(container.innerHTML).toBe('<button>1</button>');

    act(() => {
      btn.click();
    });

    expect(container.innerHTML).toBe('<button>2</button>');
  });

  it('should render on computed change', () => {
    const globalCount = ref(0);
    const globalDouble = computed(() => globalCount.value % 2 ? 'odd' : 'even');

    const fn = vi.fn();
    function Counter() {
      useUnison();
      fn();
      return <div>{globalDouble.value}</div>;
    }

    const { container } = render(<Counter />);

    act(() => {
      globalCount.value++;
    });

    expect(container.innerHTML).toBe('<div>odd</div>');
    expect(fn).toHaveBeenCalledTimes(2);

    act(() => {
      globalCount.value++;
    });

    expect(container.innerHTML).toBe('<div>even</div>');
    expect(fn).toHaveBeenCalledTimes(3);

    act(() => {
      globalCount.value * 2;
    });

    expect(container.innerHTML).toBe('<div>even</div>');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  

  it('should render on reactive change', () => {
    const store = reactive({ count: 0 });

    function Counter() {
      useUnison();
      return <button onClick={() => store.count++}>{store.count}</button>;
    }

    const { container } = render(<Counter />);

    const btn = container.querySelector('button') as HTMLButtonElement;

    act(() => {
      btn.click();
    });

    expect(container.innerHTML).toBe('<button>1</button>');

    act(() => {
      btn.click();
    });

    expect(container.innerHTML).toBe('<button>2</button>');
  });


  it('should render on triggerRef', () => {
    const globalCount = ref(0);

    const fn = vi.fn();

    function Counter() {
      useUnison();
      fn();
      return <button onClick={() => globalCount.value++}>{globalCount.value}</button>;
    }

    const { container } = render(<Counter />);

    expect(fn).toHaveBeenCalledTimes(1);

    act(() => {
      triggerRef(globalCount);
    });

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should render on customRef change', async () => {
    function wait(delay: number) {
      return new Promise((res) => setTimeout(res, delay));
    }
    function useDebouncedRef<T>(value: T, delay = 20) {
      let timeout: any;
      return customRef((track, trigger) => {
        return {
          get() {
            track()
            return value
          },
          set(newValue) {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
              value = newValue
              trigger()
            }, delay)
          }
        }
      })
    }

    const debouncedValue = useDebouncedRef(0);

    function Counter() {
      useUnison();
      return <button onClick={() => debouncedValue.value++}>{debouncedValue.value}</button>;
    }

    const { container } = render(<Counter />);

    const btn = container.querySelector('button') as HTMLButtonElement;

    act(() => {
      btn.click();
    });
    await wait(20);

    expect(container.innerHTML).toBe('<button>1</button>');

    act(() => {
      btn.click();
    });
    await wait(20);

    expect(container.innerHTML).toBe('<button>2</button>');
  });
});
